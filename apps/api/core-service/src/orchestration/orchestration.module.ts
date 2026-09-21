import { Module } from '@nestjs/common';
import { QueueModule } from '../queues/queue.module';
import { OrchestrationService } from './orchestration.service';
import { StartSimulationProcessor } from './processors/start-simulation.processor';

@Module({
  imports: [QueueModule],
  providers: [OrchestrationService, StartSimulationProcessor],
  exports: [OrchestrationService],
})
export class OrchestrationModule {}
