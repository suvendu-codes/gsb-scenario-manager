import { Injectable } from '@nestjs/common';
import { BotRepository } from '../application/ports/bot.repository.js';
import { BotType, MapBots } from '../domain/bot-type.js';

/** Mock sizer: the upstream abstraction serves mock data until the real connection lands. */
const DEFAULT_BOT_TYPES: BotType[] = [
  { type: 'quicktron_htm', name: 'Quicktron HTM', imageUrl: '', count: 10 },
  { type: 'quicktron_vtm', name: 'Quicktron VTM', imageUrl: '', count: 10 },
];

@Injectable()
export class InMemoryBotRepository implements BotRepository {
  private readonly byMap = new Map<string, BotType[]>();

  async findByMap(_projectId: string, mapId: string): Promise<MapBots> {
    const botTypes = this.byMap.get(mapId) ?? DEFAULT_BOT_TYPES;
    return Object.assign(new MapBots(), {
      mapId,
      botTypes: botTypes.map((bot) => Object.assign(new BotType(), bot)),
    });
  }

  set(mapId: string, botTypes: BotType[]) {
    this.byMap.set(mapId, botTypes);
  }
}
