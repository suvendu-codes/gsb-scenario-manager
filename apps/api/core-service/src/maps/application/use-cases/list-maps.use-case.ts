import { Inject, Injectable } from '@nestjs/common';
import {
  MAP_REPOSITORY,
  type MapRepositoryPort,
} from '../ports/map.repository.port';

@Injectable()
export class ListMapsUseCase {
  constructor(
    @Inject(MAP_REPOSITORY)
    private readonly maps: MapRepositoryPort,
  ) {}

  execute(projectId: string) {
    return this.maps.findByProject(projectId);
  }
}
