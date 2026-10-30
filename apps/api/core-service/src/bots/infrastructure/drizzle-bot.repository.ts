import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { DRIZZLE } from '../../db/db.constants.js';
import type { DrizzleDB } from '../../db/db.module.js';
import { mapBot } from '../../db/schema/map-bot.js';
import { BotRepository } from '../application/ports/bot.repository.js';
import { BotType, MapBots } from '../domain/bot-type.js';

@Injectable()
export class DrizzleBotRepository implements BotRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async findByMap(projectId: string, mapId: string): Promise<MapBots> {
    const rows = await this.db
      .select()
      .from(mapBot)
      .where(and(eq(mapBot.projectId, projectId), eq(mapBot.mapId, mapId)))
      .orderBy(asc(mapBot.type));
    return Object.assign(new MapBots(), {
      mapId,
      botTypes: rows.map((row) =>
        Object.assign(new BotType(), {
          type: row.type,
          name: row.name,
          imageUrl: row.imageUrl,
          count: row.count,
        }),
      ),
    });
  }
}
