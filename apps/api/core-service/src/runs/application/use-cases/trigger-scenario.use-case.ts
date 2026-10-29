import { randomUUID } from 'node:crypto';
import { Inject, Injectable, Optional } from '@nestjs/common';
import { createOutboxMessage } from '../../../outbox/domain/outbox-message.js';
import {
  SCENARIO_CONFIG_READER,
  type ScenarioConfigReader,
} from '../../../scenarios/application/ports/scenario-config.reader.js';
import { ScenarioNotFoundError } from '../../../scenarios/domain/errors.js';
import {
  EngineUnavailableError,
  IdempotencyKeyReuseError,
  ScenarioBlockedError,
  ScenarioInvalidError,
  ScenarioNotTriggerableError,
  StorageUnavailableError,
  TriggerUpstreamUnavailableError,
  type ScenarioIssue,
} from '../../domain/errors.js';
import { isRetryableRunStatus, isTerminalRunStatus, type Run } from '../../domain/run.js';
import { buildRunTriggerEvent } from '../../domain/run-trigger-event.js';
import { checkScenarioInputs, effectiveConfig } from '../../domain/scenario-readiness.js';
import { hashTriggerRequest, type TriggerRequest } from '../../domain/trigger-request.js';
import {
  CLOCK,
  COMMAND_TOPICS,
  CONFIG_SNAPSHOT_STORE,
  ENGINE_GATE,
  EVENT_SCHEMA_VERSION,
  ID_GENERATOR,
  RUN_TRIGGER_REPOSITORY,
  RUN_UPSTREAM,
  systemClock,
  type Clock,
  type CommandTopics,
  type ConfigSnapshotStore,
  type EngineGate,
  type IdGenerator,
  type RunTriggerRepository,
  type RunUpstream,
  type TriggerScenarioState,
} from '../ports/run-trigger.repository.js';

export interface TriggerScenarioInput {
  scenarioId: string;
  idempotencyKey: string;
  request: TriggerRequest;
  /** Acting user (x-user-email); recorded as triggered_by. */
  triggeredBy: string;
}

export interface TriggerScenarioResult {
  run: Run;
  /** true when the Idempotency-Key was used before and the existing run is returned (HTTP 200). */
  replayed: boolean;
}

/** Consecutive failed runs that block further triggers (LLD: failure brake). */
export const FAILURE_BRAKE_THRESHOLD = 3;

const defaultIds: IdGenerator = { uuid: () => randomUUID() };

/**
 * LLD §5 Trigger a run. Order: idempotency → scenario → engine gate → failure brake → status →
 * local checks (all issues) → upstream (versions) → config snapshot → one transaction (run +
 * outbox row + scenario). The API builds the complete run.trigger event; the outbox worker only
 * publishes it. Success means "durably queued", never "engine accepted".
 */
@Injectable()
export class TriggerScenarioUseCase {
  constructor(
    @Inject(RUN_TRIGGER_REPOSITORY) private readonly runs: RunTriggerRepository,
    @Inject(SCENARIO_CONFIG_READER) private readonly configs: ScenarioConfigReader,
    @Inject(RUN_UPSTREAM) private readonly upstream: RunUpstream,
    @Inject(CONFIG_SNAPSHOT_STORE) private readonly snapshots: ConfigSnapshotStore,
    @Inject(COMMAND_TOPICS) private readonly topics: CommandTopics,
    @Inject(EVENT_SCHEMA_VERSION) private readonly schemaVersion: string,
    @Inject(ENGINE_GATE) private readonly gate: EngineGate,
    @Optional() @Inject(CLOCK) private readonly clock: Clock = systemClock,
    @Optional() @Inject(ID_GENERATOR) private readonly ids: IdGenerator = defaultIds,
  ) {}

  async execute({ scenarioId, idempotencyKey, request, triggeredBy }: TriggerScenarioInput): Promise<TriggerScenarioResult> {
    const requestHash = hashTriggerRequest(scenarioId, request);

    const previous = await this.runs.findByIdempotencyKey(scenarioId, idempotencyKey);
    if (previous) return this.replay(previous, requestHash);

    const scenario = await this.runs.loadScenario(scenarioId, FAILURE_BRAKE_THRESHOLD);
    if (!scenario) throw new ScenarioNotFoundError(scenarioId);

    if (this.gate.closed.includes(request.engine)) throw new EngineUnavailableError(request.engine);
    this.assertNotBlocked(scenario);
    const latest = scenario.recentRuns[0] ?? null;
    this.assertTriggerable(scenario, latest);

    // Local checks first, every issue collected; upstream is called only when they pass.
    const config = await this.readConfig(scenario);
    const issues = checkScenarioInputs({ config, dataUris: scenario.dataUris });
    if (issues.length) throw new ScenarioInvalidError(issues);

    const resolved = await this.resolveUpstream(scenario);
    const effective = effectiveConfig(config!);

    const runId = this.ids.uuid();
    const correlationId = `cid_${this.ids.uuid()}`;
    const configSnapshotUri = await this.writeSnapshot(scenario.id, correlationId, effective);

    const event = buildRunTriggerEvent({
      scenario,
      correlationId,
      engine: request.engine,
      priority: request.priority,
      schemaVersion: this.schemaVersion,
      issuedAt: this.clock.now(),
      issuedBy: triggeredBy,
      mapVersion: resolved.mapVersion,
      sizerVersion: resolved.sizerVersion,
      config: effective,
      dataUris: scenario.dataUris,
    });

    const outcome = await this.runs.commit({
      scenarioId,
      idempotencyKey,
      expected: { status: scenario.status, latestRunId: latest?.id ?? null },
      run: {
        id: runId,
        scenarioId,
        correlationId,
        engine: request.engine,
        status: 'trigger_requested',
        priority: request.priority,
        pendingCommand: 'run',
        commandSequence: event.sequence,
        // A run after a failed/cancelled one is its retry: new correlation, linked to the old run.
        retryOfRunId: latest && isRetryableRunStatus(latest.status) ? latest.id : null,
        triggeredBy,
        mapVersion: resolved.mapVersion,
        sizerVersion: resolved.sizerVersion,
        configSnapshotUri,
        idempotencyKey,
        requestHash,
      },
      outbox: createOutboxMessage({
        id: this.ids.uuid(),
        scenarioId,
        runId,
        topic: this.topics[request.engine],
        event,
      }),
    });

    if (outcome.kind === 'existing') return this.replay(outcome.run, requestHash);
    if (outcome.kind === 'changed') {
      throw new ScenarioNotTriggerableError(outcome.status, outcome.activeRunCorrelationId ?? undefined);
    }
    return { run: outcome.run, replayed: false };
  }

  private replay(run: Run, requestHash: string): TriggerScenarioResult {
    if (run.requestHash !== requestHash) throw new IdempotencyKeyReuseError();
    return { run, replayed: true };
  }

  private assertNotBlocked({ recentRuns }: TriggerScenarioState) {
    const lastN = recentRuns.slice(0, FAILURE_BRAKE_THRESHOLD);
    if (lastN.length === FAILURE_BRAKE_THRESHOLD && lastN.every((r) => r.status === 'failed')) {
      throw new ScenarioBlockedError(FAILURE_BRAKE_THRESHOLD);
    }
  }

  /** Runnable from draft, or after the latest run failed or was cancelled. Never while a run is active. */
  private assertTriggerable(scenario: TriggerScenarioState, latest: TriggerScenarioState['recentRuns'][number] | null) {
    if (latest && !isTerminalRunStatus(latest.status)) {
      throw new ScenarioNotTriggerableError(scenario.status, latest.correlationId);
    }
    if (scenario.status === 'draft') return;
    if (scenario.status === 'finished' && latest && isRetryableRunStatus(latest.status)) return;
    // finished after a completed run: clone it to run again.
    throw new ScenarioNotTriggerableError(latest?.status === 'completed' ? 'completed' : scenario.status);
  }

  private async readConfig({ config }: TriggerScenarioState): Promise<Record<string, unknown> | null> {
    if (config.body) return config.body;
    if (!config.uri) return null;
    try {
      return await this.configs.read(config.uri);
    } catch {
      throw new StorageUnavailableError('The scenario config');
    }
  }

  private async resolveUpstream(scenario: TriggerScenarioState) {
    let resolved;
    try {
      resolved = await this.upstream.resolve({ projectId: scenario.projectId, mapId: scenario.mapId });
    } catch {
      throw new TriggerUpstreamUnavailableError('The upstream map and sizer check');
    }
    if (!resolved.ok) {
      const issues: ScenarioIssue[] = resolved.issues.map((code) => ({
        code,
        message:
          code === 'map_not_found'
            ? 'The map does not exist upstream.'
            : code === 'sizer_not_found'
              ? 'No sizer was found for the map.'
              : 'The data files do not agree with the map.',
      }));
      throw new ScenarioInvalidError(issues);
    }
    return resolved;
  }

  private async writeSnapshot(scenarioId: string, correlationId: string, config: Record<string, unknown>) {
    try {
      return await this.snapshots.writeOnce(`runs/${scenarioId}/${correlationId}/config.json`, config);
    } catch {
      throw new StorageUnavailableError('The config snapshot');
    }
  }
}
