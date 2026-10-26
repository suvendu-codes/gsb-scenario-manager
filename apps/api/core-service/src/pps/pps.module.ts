import { Module } from '@nestjs/common';
import { PPS_REPOSITORY } from './application/ports/pps.repository.js';
import { GetMapPpsUseCase } from './application/use-cases/get-map-pps.use-case.js';
import { InMemoryPpsRepository } from './infrastructure/in-memory-pps.repository.js';
import { PpsController } from './presentation/pps.controller.js';

@Module({
  controllers: [PpsController],
  providers: [
    GetMapPpsUseCase,
    { provide: PPS_REPOSITORY, useClass: InMemoryPpsRepository },
  ],
})
export class PpsModule {}
