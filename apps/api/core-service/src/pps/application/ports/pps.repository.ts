import { MapPps } from '../../domain/pps.js';

export interface PpsRepository {
  /**
   * Throws ProjectNotFoundError / MapNotFoundError / MapVersionNotFoundError when the ids
   * or version don't resolve upstream.
   */
  findByMap(projectId: string, mapId: string, mapVersion: number): Promise<MapPps>;
}

export const PPS_REPOSITORY = Symbol('PPS_REPOSITORY');
