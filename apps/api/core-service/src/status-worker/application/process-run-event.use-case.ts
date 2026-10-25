import { Inject, Injectable, Logger } from '@nestjs/common';
import { parseRunEvent } from '../domain/run-event.js';
import { RUN_EVENT_REPOSITORY, type RunEventRepository } from './ports/run-event.repository.js';

@Injectable()
export class ProcessRunEventUseCase {
  private readonly logger = new Logger(ProcessRunEventUseCase.name);
  constructor(@Inject(RUN_EVENT_REPOSITORY) private readonly runs: RunEventRepository) {}

  async execute(value: Buffer | null) {
    const event = parseRunEvent(value);
    // OBSERVABILITY PLAN: after validation, measure receipt-to-producer event age
    // and processing duration by bounded engine/event-type labels. Event age is
    // not Kafka lag: clocks may differ, retries preserve old timestamps, and idle
    // runs are normal. Track clock-skew anomalies rather than infer engine failure.
    const outcome = await this.runs.apply(event);
    // OBSERVABILITY PLAN: processed outcomes must be emitted after apply resolves
    // (transaction committed/no-op). Reuse the outcome here instead of double-
    // counting it at both repository and worker layers. Current 'ignored' does
    // not reveal why: future outcome metadata should distinguish duplicate/stale,
    // terminal-preserved, and disallowed-transition cases before labeling metrics.
    // Log only after persistence has completed, never the result payload or URLs.
    this.logger.log({
      event: 'run_event_processed',
      eventType: event.event_type,
      correlationId: event.correlation_id,
      engineRunId: event.run_id,
      engine: event.engine,
      eventStatus: event.event_type === 'run.status' ? event.status : undefined,
      sequence: 'sequence' in event ? event.sequence : undefined,
      outcome,
    });
    // TODO: integrate deduplicated gap alerts with the agreed observability tooling.
    // The committed recovery flag/inbox survives a crash between persistence and log.
    if (outcome === 'held') this.logger.warn({ event: 'run_event_sequence_gap', correlationId: event.correlation_id });
    return outcome;
  }
}
