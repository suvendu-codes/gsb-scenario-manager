import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiAcceptedResponse, ApiHeader, ApiOperation, ApiParam } from '@nestjs/swagger';
import { ZodValidationPipe } from 'nestjs-zod';
import { withSafeListener } from 'shared';
import { TriggerScenarioUseCase } from '../application/use-cases/trigger-scenario.use-case.js';
import { InvalidExecutionInputError } from '../domain/errors.js';
import { TriggerRequestSchema } from '../domain/trigger-request.js';
import {
  IdempotencyKeySchema,
  toTriggerRunResponse,
  TriggerRunResponseDto,
  TriggerScenarioDto,
} from './dto/trigger-scenario.dto.js';

@Controller('scenarios')
export class RunsController {
  constructor(@Inject(TriggerScenarioUseCase) private readonly triggerScenario: TriggerScenarioUseCase) {}

  @Post(':id/trigger')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Trigger a scenario run',
    description:
      'Creates an execution and queues the run.trigger event in the transactional outbox. ' +
      '202 means durably queued for Kafka, not accepted by the engine.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Scenario ID' })
  @ApiHeader({ name: 'Idempotency-Key', required: false, description: 'Safe-retry key, scoped to the scenario' })
  @ApiAcceptedResponse({ type: TriggerRunResponseDto })
  trigger(
    @Param('id', ParseUUIDPipe) id: string,
    // Explicit pipes: validation must not depend on emitted decorator metadata.
    @Body(new ZodValidationPipe(TriggerRequestSchema)) dto: TriggerScenarioDto,
    @Headers('idempotency-key') rawIdempotencyKey?: string,
  ) {
    return withSafeListener(`POST /scenarios/${id}/trigger`, async () => {
      const key = IdempotencyKeySchema.safeParse(rawIdempotencyKey);
      if (!key.success) throw new InvalidExecutionInputError(key.error.issues[0]?.message ?? 'Invalid Idempotency-Key');
      const { run, replayed } = await this.triggerScenario.execute({
        scenarioId: id,
        idempotencyKey: key.data,
        request: TriggerRequestSchema.parse(dto),
      });
      return toTriggerRunResponse(run, replayed);
    });
  }
}
