import { Inject, Injectable } from '@nestjs/common';
import {
  MAP_REPOSITORY,
  type MapRepository,
} from '../../../maps/application/ports/map.repository';

@Injectable()
export class ListProjectMapsUseCase {
  constructor(@Inject(MAP_REPOSITORY) private readonly maps: MapRepository) {}

  execute(projectId: string) {
    return this.maps.findByProject(projectId);
  }
}
