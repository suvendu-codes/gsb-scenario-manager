import { Injectable } from '@nestjs/common';
import { MapRepository } from '../application/ports/map.repository';
import { ProjectMap } from '../domain/map';

@Injectable()
export class InMemoryMapRepository implements MapRepository {
  private readonly maps: ProjectMap[] = [];

  async findByProject(projectId: string): Promise<ProjectMap[]> {
    return this.maps
      .filter((map) => map.projectId === projectId)
      .map((map) => Object.assign(new ProjectMap(), map));
  }

  add(map: ProjectMap) {
    this.maps.push(map);
  }
}
