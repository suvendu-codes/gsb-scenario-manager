import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { DomainErrorFilter } from './common/presentation/http-exception.filter';
import { DbModule } from './db/db.module';
import { MapsModule } from './maps/maps.module';
import { RunsModule } from './runs/runs.module';
import { ScenariosModule } from './scenarios/scenarios.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../../.env'],
    }),
    DbModule,
    MapsModule,
    ScenariosModule,
    RunsModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: DomainErrorFilter }],
})
export class AppModule {}
