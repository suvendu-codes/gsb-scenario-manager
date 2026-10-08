import { Controller, Get } from '@nestjs/common';
import { GetMapUseCase } from '../application/use-cases/get-map.use-case';

@Controller('map')
export class MapController {
  constructor(private readonly getMapUseCase: GetMapUseCase) {}

  @Get()
  getMap() {
    return this.getMapUseCase.execute();
  }
}
