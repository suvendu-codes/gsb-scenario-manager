import { Inject, Injectable } from '@nestjs/common';
import { PPS_REPOSITORY, type PpsRepository } from '../ports/pps.repository.js';

export interface GetMapPpsInput {
  projectId: string;
  mapId: string;
  mapVersion: number;
}

@Injectable()
export class GetMapPpsUseCase {
  constructor(@Inject(PPS_REPOSITORY) private readonly pps: PpsRepository) {}

  execute({ projectId, mapId, mapVersion }: GetMapPpsInput) {
    return this.pps.findByMap(projectId, mapId, mapVersion);
  }
}
