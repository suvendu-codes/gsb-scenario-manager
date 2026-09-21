import { Module } from '@nestjs/common';
import { BffLiveConsumer } from './bff-live.consumer';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [GatewayModule],
  controllers: [BffLiveConsumer],
})
export class KafkaConsumerModule {}
