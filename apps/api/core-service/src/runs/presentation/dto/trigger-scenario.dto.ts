import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { RUN_ENGINES, type Run } from '../../domain/run.js';
import { TriggerRequestSchema } from '../../domain/trigger-request.js';

export class TriggerScenarioDto extends createZodDto(TriggerRequestSchema) {}

/** LLD §5 response body (snake_case). */
const TriggerRunResponseSchema = z.object({
  correlation_id: z.string().meta({ description: 'Execution identity; also the Kafka key and the run URI id' }),
  scenario_id: z.uuid(),
  engine: z.enum(RUN_ENGINES),
  state: z.string().meta({ description: 'trigger_requested until the engine reports accepted' }),
  triggered_by: z.string(),
  created_at: z.string().meta({ format: 'date-time' }),
});

export class TriggerRunResponseDto extends createZodDto(TriggerRunResponseSchema) {}

export const toTriggerRunResponse = (run: Run): TriggerRunResponseDto => ({
  correlation_id: run.correlationId,
  scenario_id: run.scenarioId,
  engine: run.engine,
  state: run.status,
  triggered_by: run.triggeredBy,
  created_at: run.createdAt.toISOString(),
});
