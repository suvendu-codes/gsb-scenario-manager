import { z } from 'zod';
import { RUN_ENGINES, RUN_PRIORITIES, type RunEngine, type RunPriority } from './run.js';
import { DATA_SLOTS, type DataSlot } from './scenario-readiness.js';

/**
 * Wire contract for `run.trigger` (SM → engine), Event Schema Proposal (agreed v1.1 example).
 * Snake_case on the wire; the engine-owned `config` stays an opaque object.
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

/**
 * A data file by reference. Integrity metadata (sha256, size_bytes, rows) is sent when SM has it;
 * the Complete-upload flow that records it is not built yet, so today only `uri` is known.
 */
const wireDataFile = z
  .object({
    uri: z.string().min(1),
    sha256: z.string().regex(/^[0-9a-f]{64}$/).optional(),
    size_bytes: z.number().int().nonnegative().optional(),
    rows: z.number().int().nonnegative().optional(),
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
    data: z.partialRecord(z.enum(DATA_SLOTS), wireDataFile),
    config: z.record(z.string(), z.unknown()),
    run: z
      .object({
        execution_duration_minutes: z.number().int().positive(),
        stop_policy: z.enum(['hard_stop', 'informational']).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export type RunTriggerEvent = z.output<typeof RunTriggerEventSchema>;

export interface BuildRunTriggerEventInput {
  scenario: { id: string; projectId: string; mapId: string };
  correlationId: string;
  engine: RunEngine;
  priority: RunPriority;
  schemaVersion: string;
  issuedAt: Date;
  issuedBy: string;
  /** Versions pinned at trigger time. */
  mapVersion: string;
  sizerVersion: string;
  /** Effective (defaults + overrides) config. */
  config: Record<string, unknown>;
  dataUris: Record<DataSlot, string | null>;
}

/** Builds the exact event the outbox will deliver. Pure; validates the result against the wire schema. */
export function buildRunTriggerEvent(input: BuildRunTriggerEventInput): RunTriggerEvent {
  const data: RunTriggerEvent['data'] = {};
  for (const slot of DATA_SLOTS) {
    const uri = input.dataUris[slot];
    if (uri) data[slot] = { uri };
  }

  const event: RunTriggerEvent = {
    event_type: RUN_TRIGGER_EVENT_TYPE,
    command_id: 'run',
    version: input.schemaVersion,
    engine: input.engine,
    sequence: RUN_TRIGGER_SEQUENCE,
    correlation_id: input.correlationId,
    issued_at: input.issuedAt.toISOString(),
    issued_by: input.issuedBy,
    priority: input.priority,
    references: {
      project_id: input.scenario.projectId,
      scenario_id: input.scenario.id,
      map_id: input.scenario.mapId,
      map_version_id: input.mapVersion,
      pins: [
        { service: 'map_creator', artifact_type: 'map', id: input.scenario.mapId, version: input.mapVersion },
        { service: 'sizer', artifact_type: 'sizer', id: input.scenario.mapId, version: input.sizerVersion },
      ],
    },
    data,
    config: input.config,
  };

  // Guards the contract: a builder bug fails the request instead of queueing a bad event.
  return RunTriggerEventSchema.parse(event);
}
