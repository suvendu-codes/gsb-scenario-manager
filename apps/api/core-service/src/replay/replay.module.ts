import { Module } from '@nestjs/common';
import { REPLAY_REPOSITORY } from './application/ports/replay.repository.port';
import { ReadOrderEventsUseCase } from './application/use-cases/read-order-events.use-case';
import { ReplayRepository } from './infrastructure/adapters/replay.repository';
import { ReplayController } from './presentation/replay.controller';

@Module({
  controllers: [ReplayController],
  providers: [
    ReadOrderEventsUseCase,
    {
      provide: REPLAY_REPOSITORY,
      useClass: ReplayRepository,
    },
  ],
})
export class ReplayModule {}
