import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { RUN_ENGINES, RUN_PRIORITIES, type Run } from '../../domain/run.js';
import { TriggerRequestSchema } from '../../domain/trigger-request.js';

export class TriggerScenarioDto extends createZodDto(TriggerRequestSchema) {}

/** Optional client retry key; same key + same body returns the original run. */
export const IdempotencyKeySchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(/^[\x21-\x7e]+$/, 'Idempotency-Key must be printable ASCII without spaces')
  .optional();

const TriggerRunResponseSchema = z.object({
  runId: z.uuid().meta({ description: 'Internal SM execution id' }),
  scenarioId: z.uuid(),
  correlationId: z.string().meta({ description: 'Execution identity sent to the engine (Kafka key)' }),
  engine: z.enum(RUN_ENGINES),
  status: z.string().meta({ description: 'Confirmed state; trigger_requested until the engine accepts' }),
  pendingCommand: z.string().nullable(),
  commandSequence: z.number().int(),
  priority: z.enum(RUN_PRIORITIES),
  createdAt: z.string().meta({ format: 'date-time' }),
  replayed: z.boolean().meta({ description: 'true when returned for a repeated Idempotency-Key' }),
});

export class TriggerRunResponseDto extends createZodDto(TriggerRunResponseSchema) {}

export const toTriggerRunResponse = (run: Run, replayed: boolean): TriggerRunResponseDto => ({
  runId: run.id,
  scenarioId: run.scenarioId,
  correlationId: run.correlationId,
  engine: run.engine,
  status: run.status,
  pendingCommand: run.pendingCommand,
  commandSequence: run.commandSequence,
  priority: run.priority,
  createdAt: run.createdAt.toISOString(),
  replayed,
});
