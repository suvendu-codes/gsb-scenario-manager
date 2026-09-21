import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { Queue_Names } from '../queues/queue.constants';

@Injectable()
export class OrchestrationService {
  constructor(
    @InjectQueue(Queue_Names.START_SIMULATION)
    private readonly startSimulationQueue: Queue,
  ) {}

  enqueueStartSimulation(payload: unknown) {
    return this.startSimulationQueue.add('start', payload);
  }
}
