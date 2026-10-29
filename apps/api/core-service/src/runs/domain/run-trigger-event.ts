import { z } from 'zod';
import { InvalidExecutionInputError } from './errors.js';
import { RUN_ENGINES, RUN_PRIORITIES, type RunEngine } from './run.js';
import { DATA_SLOTS, type DataSlot, type TriggerRequest } from './trigger-request.js';

/**
 * Wire contract for `run.trigger` (SM → engine), Event Schema Proposal v28, agreed v1.1 example.
 * Snake_case on the wire. Engine-owned `config` / `build` stay opaque objects.
 */
export const RUN_TRIGGER_EVENT_TYPE = 'run.trigger';
export const RUN_TRIGGER_SEQUENCE = 1;

const wirePin = z
  .object({
    service: z.string().min(1),
    artifact_type: z.string().min(1),
    id: z.string().min(1),
    version: z.string().min(1).optional(),
    version_id: z.string().min(1).optional(),
    etag: z.string().min(1).optional(),
  })
  .strict();

const wireDataFile = z
  .object({
    uri: z.string().min(1),
    sha256: z.string().regex(/^[0-9a-f]{64}$/),
    size_bytes: z.number().int().nonnegative(),
    rows: z.number().int().nonnegative(),
  })
  .strict();

export const RunTriggerEventSchema = z
  .object({
    event_type: z.literal(RUN_TRIGGER_EVENT_TYPE),
    command_id: z.literal('run'),
    version: z.string().min(1),
    engine: z.enum(RUN_ENGINES),
    sequence: z.literal(RUN_TRIGGER_SEQUENCE),
    correlation_id: z.string().min(1),
    issued_at: z.iso.datetime({ offset: true }),
    issued_by: z.string().min(1).optional(),
    priority: z.enum(RUN_PRIORITIES),
    references: z
      .object({
        project_id: z.string().min(1),
        scenario_id: z.string().min(1),
        map_id: z.string().min(1),
        map_version_id: z.string().min(1).optional(),
        pins: z.array(wirePin).min(1),
      })
      .strict(),
    build: z.record(z.string(), z.unknown()).optional(),
    data: z.partialRecord(z.enum(DATA_SLOTS), wireDataFile),
    config: z.record(z.string(), z.unknown()),
    run: z
      .object({
        execution_duration_minutes: z.number().int().positive(),
        stop_policy: z.enum(['hard_stop', 'informational']).optional(),
      })
      .strict(),
  })
  .strict();

export type RunTriggerEvent = z.output<typeof RunTriggerEventSchema>;

/** The scenario facts the trigger reads under lock. */
export interface TriggerScenarioSnapshot {
  id: string;
  projectId: string;
  mapId: string;
  status: string;
  /** File URIs already stored on the scenario row, by slot (null when not uploaded). */
  dataUris: Record<DataSlot, string | null>;
}

export interface BuildRunTriggerEventInput {
  scenario: TriggerScenarioSnapshot;
  correlationId: string;
  schemaVersion: string;
  issuedAt: Date;
  request: TriggerRequest & { engine: RunEngine };
}

/**
 * Every file the scenario already stores must be sent with its integrity metadata, and the
 * URI must be the stored one: a run reads exactly what the user saw.
 */
export function assertDataMatchesScenario(scenario: TriggerScenarioSnapshot, request: TriggerRequest) {
  for (const slot of DATA_SLOTS) {
    const stored = scenario.dataUris[slot];
    const sent = request.data[slot];
    if (stored && !sent) {
      throw new InvalidExecutionInputError(
        `data.${slot} is required: scenario ${scenario.id} has a stored ${slot} file`,
      );
    }
    if (stored && sent && sent.uri !== stored) {
      throw new InvalidExecutionInputError(
        `data.${slot}.uri does not match the file stored on scenario ${scenario.id}`,
      );
    }
  }
}

/** Builds the exact event the outbox will deliver. Pure; validates the result against the wire schema. */
export function buildRunTriggerEvent({
  scenario,
  correlationId,
  schemaVersion,
  issuedAt,
  request,
}: BuildRunTriggerEventInput): RunTriggerEvent {
  assertDataMatchesScenario(scenario, request);

  const data: RunTriggerEvent['data'] = {};
  for (const slot of DATA_SLOTS) {
    const file = request.data[slot];
    if (file) {
      data[slot] = {
        uri: file.uri,
        sha256: file.sha256,
        size_bytes: file.sizeBytes,
        rows: file.rows,
      };
    }
  }

  const event: RunTriggerEvent = {
    event_type: RUN_TRIGGER_EVENT_TYPE,
    command_id: 'run',
    version: schemaVersion,
    engine: request.engine,
    sequence: RUN_TRIGGER_SEQUENCE,
    correlation_id: correlationId,
    issued_at: issuedAt.toISOString(),
    ...(request.issuedBy ? { issued_by: request.issuedBy } : {}),
    priority: request.priority,
    references: {
      project_id: scenario.projectId,
      scenario_id: scenario.id,
      map_id: scenario.mapId,
      ...(request.references.mapVersionId
        ? { map_version_id: request.references.mapVersionId }
        : {}),
      pins: request.references.pins.map((pin) => ({
        service: pin.service,
        artifact_type: pin.artifactType,
        id: pin.id,
        ...(pin.version !== undefined ? { version: pin.version } : {}),
        ...(pin.versionId !== undefined ? { version_id: pin.versionId } : {}),
        ...(pin.etag !== undefined ? { etag: pin.etag } : {}),
      })),
    },
    ...(request.build ? { build: request.build } : {}),
    data,
    config: request.config,
    run: {
      execution_duration_minutes: request.run.executionDurationMinutes,
      ...(request.run.stopPolicy ? { stop_policy: request.run.stopPolicy } : {}),
    },
  };

  // Guards the contract: a builder bug fails the request instead of queueing a bad event.
  return RunTriggerEventSchema.parse(event);
}
