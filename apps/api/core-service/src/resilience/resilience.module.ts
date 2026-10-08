import { Module } from '@nestjs/common';
import { SharedResilienceModule } from './shared-resilience.module';
import { MAP_GATEWAY } from './application/ports/map-gateway.port';
import { GetMapUseCase } from './application/use-cases/get-map.use-case';
import { MapController } from './presentation/map.controller';
import { ProxyGatewayClientService } from './proxy-gateway-client.service';

@Module({
  imports: [SharedResilienceModule],
  controllers: [MapController],
  providers: [
    ProxyGatewayClientService,
    GetMapUseCase,
    {
      provide: MAP_GATEWAY,
      useExisting: ProxyGatewayClientService,
    },
  ],
  exports: [ProxyGatewayClientService],
})
export class ResilienceModule {}
