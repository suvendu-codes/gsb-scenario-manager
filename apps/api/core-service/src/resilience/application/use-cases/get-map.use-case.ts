import { Inject, Injectable } from '@nestjs/common';
import { MAP_GATEWAY, type MapGatewayPort } from '../ports/map-gateway.port';

@Injectable()
export class GetMapUseCase {
  constructor(
    @Inject(MAP_GATEWAY)
    private readonly maps: MapGatewayPort,
  ) {}

  execute() {
    return this.maps.getMap();
  }
}
