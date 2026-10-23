import { MapPps } from '../../domain/pps.js';

export interface PpsRepository {
  /** Throws ProjectNotFoundError / MapNotFoundError when the ids don't resolve upstream. */
  findByMap(projectId: string, mapId: string): Promise<MapPps>;
}

export const PPS_REPOSITORY = Symbol('PPS_REPOSITORY');
