import { Module } from '@nestjs/common';
import { RUN_REPOSITORY } from './application/ports/run.repository.port';
import { TriggerRunUseCase } from './application/use-cases/trigger-run.use-case';
import { InMemoryRunRepository } from './infrastructure/adapters/in-memory-run.repository';
import { RunsController } from './presentation/runs.controller';

@Module({
  controllers: [RunsController],
  providers: [
    TriggerRunUseCase,
    {
      provide: RUN_REPOSITORY,
      useClass: InMemoryRunRepository,
    },
  ],
})
export class RunsModule {}
