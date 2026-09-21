import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GatewayModule } from './gateway/gateway.module';
import { KafkaConsumerModule } from './kafka-consumer/kafka-consumer.module';
import { ResilienceModule } from './resilience/resilience.module';

@Module({
  imports: [GatewayModule, KafkaConsumerModule, ResilienceModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
