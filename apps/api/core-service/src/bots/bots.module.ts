import { Module } from '@nestjs/common';
import { BOT_REPOSITORY } from './application/ports/bot.repository.js';
import { GetMapBotsUseCase } from './application/use-cases/get-map-bots.use-case.js';
import { DrizzleBotRepository } from './infrastructure/drizzle-bot.repository.js';
import { BotsController } from './presentation/bots.controller.js';

@Module({
  controllers: [BotsController],
  providers: [
    GetMapBotsUseCase,
    { provide: BOT_REPOSITORY, useClass: DrizzleBotRepository },
  ],
})
export class BotsModule {}
