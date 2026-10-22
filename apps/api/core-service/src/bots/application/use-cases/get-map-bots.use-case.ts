import { Inject, Injectable } from '@nestjs/common';
import { BOT_REPOSITORY, type BotRepository } from '../ports/bot.repository.js';

export interface GetMapBotsInput {
  projectId: string;
  mapId: string;
}

@Injectable()
export class GetMapBotsUseCase {
  constructor(@Inject(BOT_REPOSITORY) private readonly bots: BotRepository) {}

  execute({ projectId, mapId }: GetMapBotsInput) {
    return this.bots.findByMap(projectId, mapId);
  }
}
