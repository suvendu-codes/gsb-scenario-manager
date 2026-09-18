import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

@Injectable()
export class OrchestrationService {
  constructor(
    @InjectQueue('start-simulation')
    private readonly startSimulationQueue: Queue,
  ) {}

  enqueueStartSimulation(payload: unknown) {
    return this.startSimulationQueue.add('start', payload);
  }
}
