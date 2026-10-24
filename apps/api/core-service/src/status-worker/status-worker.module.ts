import { Module, type DynamicModule, type ModuleMetadata } from '@nestjs/common';
import type { AdapterProvider } from '../common/adapter-provider.js';
import { EVENT_SOURCE, type EventSource } from './application/ports/event-source.js';
import { RUN_EVENT_REPOSITORY, type RunEventRepository } from './application/ports/run-event.repository.js';
import { ProcessRunEventUseCase } from './application/process-run-event.use-case.js';
import { StatusWorker } from './application/status-worker.js';

export interface StatusWorkerAdapters {
  imports?: ModuleMetadata['imports'];
  eventSource: AdapterProvider<EventSource>;
  runRepository: AdapterProvider<RunEventRepository>;
}

@Module({})
export class StatusWorkerModule {
  static register(adapters: StatusWorkerAdapters): DynamicModule {
    return {
      module: StatusWorkerModule,
      imports: adapters.imports ?? [],
      providers: [
        { ...adapters.eventSource, provide: EVENT_SOURCE },
        { ...adapters.runRepository, provide: RUN_EVENT_REPOSITORY },
        ProcessRunEventUseCase,
        StatusWorker,
      ],
      exports: [EVENT_SOURCE, RUN_EVENT_REPOSITORY],
    };
  }
}
