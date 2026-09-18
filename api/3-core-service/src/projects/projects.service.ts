import { Injectable } from '@nestjs/common';
import { CreateProjectDto } from './dto/create-project.dto';
import { Project } from './entities/project.entity';

@Injectable()
export class ProjectsService {
  findAll(): Project[] {
    return [];
  }

  create(dto: CreateProjectDto): Project {
    return { id: crypto.randomUUID(), name: dto.name };
  }
}
