import { Injectable } from '@nestjs/common';
import { MapRepositoryPort } from '../../application/ports/map.repository.port';
import { ProjectMap } from '../../domain/entities/map.entity';
import { int, pastDate, pick } from '../../../common/random';

const NAMES = [
  'Warehouse A',
  'Cross-dock',
  'Cold storage',
  'Mezzanine',
  'Yard',
];

@Injectable()
export class InMemoryMapRepository implements MapRepositoryPort {
  findByProject(projectId: string): ProjectMap[] {
    return Array.from({ length: int(2, 5) }, () => ({
      id: crypto.randomUUID(),
      projectId,
      name: `${pick(NAMES)} ${int(1, 9)}`,
      width: int(20, 200),
      height: int(20, 200),
      updatedAt: pastDate(),
    }));
  }
}
