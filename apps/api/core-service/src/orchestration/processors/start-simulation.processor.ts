import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { Queue_Names } from '../../queues/queue.constants';

@Processor(Queue_Names.START_SIMULATION)
export class StartSimulationProcessor extends WorkerHost {
  private readonly logger = new Logger(StartSimulationProcessor.name);

  process(job: Job): Promise<void> {
    this.logger.log(`start-simulation job ${job.id}`);
    return Promise.resolve();
  }
}
