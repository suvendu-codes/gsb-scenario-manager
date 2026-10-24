import { Inject, Injectable, Logger } from '@nestjs/common';
import { parseRunEvent } from '../domain/run-event.js';
import { RUN_EVENT_REPOSITORY, type RunEventRepository } from './ports/run-event.repository.js';

@Injectable()
export class ProcessRunEventUseCase {
  private readonly logger = new Logger(ProcessRunEventUseCase.name);
  constructor(@Inject(RUN_EVENT_REPOSITORY) private readonly runs: RunEventRepository) {}

  async execute(value: Buffer | null) {
    const event = parseRunEvent(value);
    const outcome = await this.runs.apply(event);
    // Log only after persistence has completed, never the result payload or URLs.
    this.logger.log({
      event: 'run_event_processed',
      eventType: event.event_type,
      correlationId: event.correlation_id,
      engineRunId: event.run_id,
      engine: event.engine,
      eventStatus: event.status,
      outcome,
    });
    return outcome;
  }
}
