import { Injectable } from '@nestjs/common';
import { ProjectRepositoryPort } from '../../application/ports/project.repository.port';
import { Project } from '../../domain/entities/project.entity';
import { int, pastDate, pick } from '../../../common/random';

const NAMES = ['Atlas', 'Orion', 'Nimbus', 'Helios', 'Vega', 'Titan', 'Zephyr'];

@Injectable()
export class InMemoryProjectRepository implements ProjectRepositoryPort {
  findAll(): Project[] {
    return Array.from({ length: int(3, 6) }, () => ({
      id: crypto.randomUUID(),
      name: `${pick(NAMES)} ${int(1, 99)}`,
      mapCount: int(1, 8),
      createdAt: pastDate(),
    }));
  }
}
