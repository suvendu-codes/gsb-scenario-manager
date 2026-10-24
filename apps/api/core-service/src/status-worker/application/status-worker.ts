import { Inject, Injectable, Logger, type OnModuleInit, type BeforeApplicationShutdown } from '@nestjs/common';
import { EVENT_SOURCE, type EventDelivery, type EventSource } from './ports/event-source.js';
import { ProcessRunEventUseCase } from './process-run-event.use-case.js';

@Injectable()
export class StatusWorker implements OnModuleInit, BeforeApplicationShutdown {
  private readonly logger = new Logger(StatusWorker.name);

  constructor(
    @Inject(EVENT_SOURCE) private readonly source: EventSource,
    @Inject(ProcessRunEventUseCase) private readonly processEvent: ProcessRunEventUseCase,
  ) {}

  async onModuleInit() {
    this.logger.log({ event: 'status_worker_starting' });
    try {
      await this.source.start((delivery) => this.handleMessage(delivery));
      this.logger.log({ event: 'status_worker_started' });
    } catch (error) {
      this.logger.error({ event: 'status_worker_start_failed' });
      throw error;
    }
  }

  async handleMessage(delivery: EventDelivery) {
    const context = delivery.context;
    const started = performance.now();
    let stage: 'processing' | 'acknowledgement' = 'processing';
    this.logger.log({ ...context, event: 'run_event_received' });
    try {
      const outcome = await this.processEvent.execute(delivery.body);
      stage = 'acknowledgement';
      await delivery.acknowledge();
      this.logger.log({
        ...context, event: 'run_event_acknowledged', outcome,
        durationMs: Math.round(performance.now() - started),
      });
    } catch (error) {
      this.logger.error({ ...context, event: 'run_event_not_acknowledged', stage });
      throw error;
    }
  }

  async beforeApplicationShutdown() {
    this.logger.log({ event: 'status_worker_stopping' });
    await this.source.stop();
    this.logger.log({ event: 'status_worker_disconnected' });
  }
}
