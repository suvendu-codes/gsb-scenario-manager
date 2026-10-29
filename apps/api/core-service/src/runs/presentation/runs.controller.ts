import { Body, Controller, Headers, HttpStatus, Inject, Param, Post, Res, UseFilters } from '@nestjs/common';
import { ApiAcceptedResponse, ApiHeader, ApiOkResponse, ApiOperation, ApiParam } from '@nestjs/swagger';
import { ZodValidationPipe } from 'nestjs-zod';
import { z } from 'zod';
import { withSafeListener } from 'shared';
import { UserEmail } from '../../common/decorator/user-email.decorator.js';
import { ScenarioNotFoundError } from '../../scenarios/domain/errors.js';
import { TriggerScenarioUseCase } from '../application/use-cases/trigger-scenario.use-case.js';
import { IdempotencyKeyRequiredError } from '../domain/errors.js';
import { IdempotencyKeySchema, TriggerRequestSchema } from '../domain/trigger-request.js';
import { toTriggerRunResponse, TriggerRunResponseDto, TriggerScenarioDto } from './dto/trigger-scenario.dto.js';
import { RunsErrorFilter } from './runs-error.filter.js';

interface HttpRes {
  status(code: number): unknown;
  setHeader(name: string, value: string): void;
}

const uuid = z.uuid();

@Controller('scenarios')
@UseFilters(RunsErrorFilter)
export class RunsController {
  constructor(@Inject(TriggerScenarioUseCase) private readonly triggerScenario: TriggerScenarioUseCase) {}

  @Post(':id/runs')
  @ApiOperation({
    summary: 'Trigger a run (also used for Retry)',
    description:
      'Validates the stored scenario, pins upstream versions and the config snapshot, creates the run and ' +
      'queues run.trigger in the transactional outbox. 202 means durably queued, not accepted by the engine. ' +
      'A repeated Idempotency-Key returns 200 with the original run.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Scenario ID' })
  @ApiHeader({ name: 'Idempotency-Key', required: true, description: 'UUID per user intent; reuse it for retries' })
  @ApiHeader({ name: 'x-user-email', required: false, description: 'Acting user, set by the gateway' })
  @ApiAcceptedResponse({ type: TriggerRunResponseDto, description: 'Run created' })
  @ApiOkResponse({ type: TriggerRunResponseDto, description: 'Idempotency-Key already used; existing run' })
  trigger(
    @Param('id') id: string,
    // Explicit pipe: validation must not depend on emitted decorator metadata.
    @Body(new ZodValidationPipe(TriggerRequestSchema)) dto: TriggerScenarioDto,
    @Headers('idempotency-key') rawIdempotencyKey: string | undefined,
    @UserEmail() triggeredBy: string,
    @Res({ passthrough: true }) res: HttpRes,
  ) {
    return withSafeListener(`POST /scenarios/${id}/runs`, async () => {
      // A path id that is not a UUID can't name a scenario.
      if (!uuid.safeParse(id).success) throw new ScenarioNotFoundError(id);
      const key = IdempotencyKeySchema.safeParse(rawIdempotencyKey);
      if (!key.success) throw new IdempotencyKeyRequiredError(key.error.issues[0]?.message);

      const { run, replayed } = await this.triggerScenario.execute({
        scenarioId: id,
        idempotencyKey: key.data,
        request: TriggerRequestSchema.parse(dto),
        triggeredBy,
      });
      res.status(replayed ? HttpStatus.OK : HttpStatus.ACCEPTED);
      res.setHeader('Location', `/v1/runs/${encodeURIComponent(run.correlationId)}`);
      return toTriggerRunResponse(run);
    });
  }
}
