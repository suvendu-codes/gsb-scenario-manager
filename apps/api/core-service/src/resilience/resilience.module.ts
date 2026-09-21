import { Module } from '@nestjs/common';
import { SharedResilienceModule } from './shared-resilience.module';
import { ProxyGatewayClientService } from './proxy-gateway-client.service';

@Module({
  imports: [SharedResilienceModule],
  providers: [ProxyGatewayClientService],
  exports: [ProxyGatewayClientService],
})
export class ResilienceModule {}
