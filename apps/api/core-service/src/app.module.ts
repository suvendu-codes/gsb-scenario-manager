import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';
import { DomainErrorFilter } from './common/presentation/http-exception.filter.js';
import { DbModule } from './db/db.module.js';
import { ScenariosModule } from './scenarios/scenarios.module.js';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), DbModule, ScenariosModule],
  providers: [
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_FILTER, useClass: DomainErrorFilter },
  ],
})
export class AppModule {}
