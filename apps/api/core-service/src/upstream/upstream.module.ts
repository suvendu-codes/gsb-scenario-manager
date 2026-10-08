import { Module } from '@nestjs/common';
import { UPSTREAM } from './application/ports/upstream.port';
import { GetAgentOperationsUseCase } from './application/use-cases/get-agent-operations.use-case';
import { GetUpstreamMapsUseCase } from './application/use-cases/get-upstream-maps.use-case';
import { GetUpstreamProjectsUseCase } from './application/use-cases/get-upstream-projects.use-case';
import { GetUpstreamSolutionsUseCase } from './application/use-cases/get-upstream-solutions.use-case';
import { UpstreamAdapter } from './infrastructure/adapters/upstream.adapter';
import { UpstreamController } from './presentation/upstream.controller';

@Module({
  controllers: [UpstreamController],
  providers: [
    GetUpstreamProjectsUseCase,
    GetUpstreamSolutionsUseCase,
    GetAgentOperationsUseCase,
    GetUpstreamMapsUseCase,
    {
      provide: UPSTREAM,
      useClass: UpstreamAdapter,
    },
  ],
})
export class UpstreamModule {}
