import { Module } from '@nestjs/common';
import { appConfig } from '../config.js';
import {
  COMMAND_TOPICS,
  EVENT_SCHEMA_VERSION,
  RUN_TRIGGER_REPOSITORY,
} from './application/ports/run-trigger.repository.js';
import { TriggerScenarioUseCase } from './application/use-cases/trigger-scenario.use-case.js';
import { DrizzleRunTriggerRepository } from './infrastructure/drizzle-run-trigger.repository.js';
import { RunsController } from './presentation/runs.controller.js';

@Module({
  controllers: [RunsController],
  providers: [
    TriggerScenarioUseCase,
    { provide: RUN_TRIGGER_REPOSITORY, useClass: DrizzleRunTriggerRepository },
    { provide: COMMAND_TOPICS, useValue: appConfig.kafka.topics },
    { provide: EVENT_SCHEMA_VERSION, useValue: appConfig.eventSchemaVersion },
  ],
})
export class RunsModule {}
