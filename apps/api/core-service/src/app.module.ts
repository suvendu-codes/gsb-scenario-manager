import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';
import { DomainErrorFilter } from './common/presentation/http-exception.filter.js';
import { DbModule } from './db/db.module.js';
import { PpsModule } from './pps/pps.module.js';
import { RunsModule } from './runs/runs.module.js';
import { ScenariosModule } from './scenarios/scenarios.module.js';
import { StatusWorkerModule } from './status-worker/status-worker.module.js';
import { KafkaEventSourceModule } from './status-worker/infrastructure/kafka-event-source.module.js';
import { KafkaEventSource } from './status-worker/infrastructure/kafka-event-source.js';
import { DrizzleRunEventRepository } from './status-worker/infrastructure/drizzle-run-event.repository.js';
import { DrizzleScenarioRepository } from './scenarios/infrastructure/drizzle-scenario.repository.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), DbModule, PpsModule,
    ScenariosModule.register({ repository: { useClass: DrizzleScenarioRepository } }),
    RunsModule,
    StatusWorkerModule.register({
      imports: [KafkaEventSourceModule],
      eventSource: { useExisting: KafkaEventSource },
      runRepository: { useClass: DrizzleRunEventRepository },
    }),
  ],
  providers: [
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_FILTER, useClass: DomainErrorFilter },
  ],
})
export class AppModule {}
