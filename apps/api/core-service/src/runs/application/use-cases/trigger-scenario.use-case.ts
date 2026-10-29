import { randomUUID } from 'node:crypto';
import { Inject, Injectable, Optional } from '@nestjs/common';
import { createOutboxMessage } from '../../../outbox/domain/outbox-message.js';
import {
  ActiveRunExistsError,
  IdempotencyKeyReusedError,
  ScenarioNotTriggerableError,
} from '../../domain/errors.js';
import type { Run } from '../../domain/run.js';
import { buildRunTriggerEvent } from '../../domain/run-trigger-event.js';
import { hashTriggerRequest, type TriggerRequest } from '../../domain/trigger-request.js';
import {
  CLOCK,
  COMMAND_TOPICS,
  EVENT_SCHEMA_VERSION,
  ID_GENERATOR,
  RUN_TRIGGER_REPOSITORY,
  systemClock,
  type Clock,
  type CommandTopics,
  type IdGenerator,
  type RunTriggerRepository,
  type TriggerContext,
  type TriggerPlan,
} from '../ports/run-trigger.repository.js';

export interface TriggerScenarioInput {
  scenarioId: string;
  idempotencyKey?: string;
  request: TriggerRequest;
}

export interface TriggerScenarioResult {
  run: Run;
  /** true when an earlier request with the same Idempotency-Key produced this run. */
  replayed: boolean;
}

/** Scenario statuses from which a new execution may start (draft, or after a terminal run). */
const TRIGGERABLE_SCENARIO_STATUSES = new Set(['draft', 'finished']);

const defaultIds: IdGenerator = { uuid: () => randomUUID() };

/**
 * Starts an execution. The API — not the worker — builds the complete `run.trigger` event,
 * so the queued payload is a snapshot of what the user ran. HTTP success means "durably
 * queued", never "engine accepted".
 */
@Injectable()
export class TriggerScenarioUseCase {
  constructor(
    @Inject(RUN_TRIGGER_REPOSITORY) private readonly runs: RunTriggerRepository,
    @Inject(COMMAND_TOPICS) private readonly topics: CommandTopics,
    @Inject(EVENT_SCHEMA_VERSION) private readonly schemaVersion: string,
    @Optional() @Inject(CLOCK) private readonly clock: Clock = systemClock,
    @Optional() @Inject(ID_GENERATOR) private readonly ids: IdGenerator = defaultIds,
  ) {}

  async execute({ scenarioId, idempotencyKey, request }: TriggerScenarioInput): Promise<TriggerScenarioResult> {
    const requestHash = hashTriggerRequest(scenarioId, request);
    const key = idempotencyKey ?? null;

    const outcome = await this.runs.trigger(scenarioId, key, (ctx) =>
      this.plan(ctx, request, key, requestHash),
    );

    if (outcome.kind === 'existing') {
      if (outcome.run.requestHash !== requestHash) throw new IdempotencyKeyReusedError(key!);
      return { run: outcome.run, replayed: true };
    }
    return { run: outcome.run, replayed: false };
  }

  private plan(
    { scenario, activeRun }: TriggerContext,
    request: TriggerRequest,
    idempotencyKey: string | null,
    requestHash: string,
  ): TriggerPlan {
    if (activeRun) throw new ActiveRunExistsError(scenario.id, activeRun.id, activeRun.status);
    if (!TRIGGERABLE_SCENARIO_STATUSES.has(scenario.status)) {
      throw new ScenarioNotTriggerableError(scenario.id, scenario.status);
    }

    const runId = this.ids.uuid();
    const correlationId = `cid_${this.ids.uuid()}`;
    const event = buildRunTriggerEvent({
      scenario,
      correlationId,
      schemaVersion: this.schemaVersion,
      issuedAt: this.clock.now(),
      request,
    });

    return {
      run: {
        id: runId,
        scenarioId: scenario.id,
        correlationId,
        engine: request.engine,
        status: 'trigger_requested',
        pendingCommand: 'run',
        commandSequence: event.sequence,
        idempotencyKey,
        requestHash,
      },
      outbox: createOutboxMessage({
        id: this.ids.uuid(),
        scenarioId: scenario.id,
        runId,
        topic: this.topics[request.engine],
        event,
      }),
      scenarioStatus: 'running',
    };
  }
}
