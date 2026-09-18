import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { OrchestrationService } from './orchestration.service';
import { StartSimulationProcessor } from './processors/start-simulation.processor';

const redisConnection = {
  host: process.env.REDIS_HOST ?? 'localhost',
  port: Number(process.env.REDIS_PORT ?? 6379),
};

@Module({
  imports: [
    BullModule.forRoot({
      connection: redisConnection,
    }),
    BullModule.registerQueue({
      name: 'start-simulation',
    }),
  ],
  providers: [OrchestrationService, StartSimulationProcessor],
  exports: [OrchestrationService],
})
export class OrchestrationModule {}
