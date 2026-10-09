import { Module } from '@nestjs/common';
import { ScenariosModule } from '../scenarios/scenarios.module';
import { RUN_REPOSITORY } from './application/ports/run.repository';
import { RUN_TRIGGER } from './application/ports/run-trigger.port';
import { TriggerRunUseCase } from './application/use-cases/trigger-run.use-case';
import { DrizzleRunRepository } from './infrastructure/drizzle-run.repository';
import { HttpRunTriggerAdapter } from './infrastructure/http-run-trigger.adapter';
import { RunsController } from './presentation/runs.controller';

@Module({
  imports: [ScenariosModule],
  controllers: [RunsController],
  providers: [
    TriggerRunUseCase,
    { provide: RUN_REPOSITORY, useClass: DrizzleRunRepository },
    { provide: RUN_TRIGGER, useClass: HttpRunTriggerAdapter },
  ],
})
export class RunsModule {}
