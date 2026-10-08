import { Controller, Get, Param } from '@nestjs/common';
import { ListMapsUseCase } from '../application/use-cases/list-maps.use-case';

@Controller()
export class MapsController {
  constructor(private readonly listMaps: ListMapsUseCase) {}

  @Get('projects/:id/maps')
  findByProject(@Param('id') id: string) {
    return this.listMaps.execute(id);
  }
}
