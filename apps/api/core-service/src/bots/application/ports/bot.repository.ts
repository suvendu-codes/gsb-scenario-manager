import { MapBots } from '../../domain/bot-type.js';

export interface BotRepository {
  /** Throws ProjectNotFoundError / MapNotFoundError when the ids don't resolve upstream. */
  findByMap(projectId: string, mapId: string): Promise<MapBots>;
}

export const BOT_REPOSITORY = Symbol('BOT_REPOSITORY');
