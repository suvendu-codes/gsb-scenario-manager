import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';
import { DomainErrorFilter } from './common/presentation/http-exception.filter';
import { DbModule } from './db/db.module';
import { MapsModule } from './maps/maps.module';
import { ProjectsModule } from './projects/projects.module';
import { RunsModule } from './runs/runs.module';
import { ScenariosModule } from './scenarios/scenarios.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DbModule,
    MapsModule,
    ProjectsModule,
    RunsModule,
    ScenariosModule,
  ],
  providers: [
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({ transform: true, whitelist: true }),
    },
    { provide: APP_FILTER, useClass: DomainErrorFilter },
  ],
})
export class AppModule {}
