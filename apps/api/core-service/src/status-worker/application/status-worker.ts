import { Inject, Injectable, Logger, type OnModuleInit, type BeforeApplicationShutdown } from '@nestjs/common';
import { EVENT_SOURCE, type EventDelivery, type EventSource } from './ports/event-source.js';
import { ProcessRunEventUseCase } from './process-run-event.use-case.js';
import { RunEventRejectedError } from '../domain/run-event-rejection.js';

@Injectable()
export class StatusWorker implements OnModuleInit, BeforeApplicationShutdown {
  // OBSERVABILITY PLAN (SMF-482; not runtime instrumentation): proposed metric
  // names below must be aligned with the team's tooling before implementation.
  // Keep metric labels bounded (stage/outcome/rejection code/validated engine).
  // Run/correlation IDs, offsets, URLs, exception messages, and payload fields
  // belong only in approved diagnostic context, never metric labels. Never log
  // raw events, result JSON, signed URLs, tokens, or credentials.
  private readonly logger = new Logger(StatusWorker.name);

  constructor(
    @Inject(EVENT_SOURCE) private readonly source: EventSource,
    @Inject(ProcessRunEventUseCase) private readonly processEvent: ProcessRunEventUseCase,
  ) {}

  async onModuleInit() {
    // OBSERVABILITY PLAN: startup attempts/failures and startup-duration seconds;
    // structured logs identify starting/started/failed and the deployment instance.
    // Startup success is not ongoing consumer readiness. Detect a missing worker
    // externally (platform/probes), not through its own last-event metric alone.
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
    // OBSERVABILITY PLAN: count received delivery attempts, processed outcomes
    // (updated/ignored), and acknowledged deliveries separately. They are not
    // unique engine-event counts: replay can increase attempt/ack counters.
    // Histograms: processing duration and end-to-end handling duration in seconds;
    // processing ends after persistence, total success ends after offset commit.
    // Log topic/partition/offset plus stage/outcome/duration for correlation;
    // attach execution IDs only after validation, using the approved log context.
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
      // Rejections have sanitized codes, distinct from infrastructure failures.
      // Follow-up after observability discovery (SMF-482): metrics and deduplicated alerts
      // with source coordinates for investigation/reporting to the engine team.
      // Durable capture/replay belongs to SMF-503/504; never acknowledge a rejected
      // event before capture succeeds, alter run state, or log raw payloads here.
      // Until that policy is implemented, retain the existing unacknowledged failure.
      // OBSERVABILITY PLAN: failures_total{stage,category,rejection_code}, with a
      // bounded category separating rejected input from infrastructure/commit
      // failures. Do not classify an arbitrary exception as a producer defect.
      // Deduplicate persistent-record alerts by group/topic/partition/offset, and
      // aggregate engine-team reports by reason/engine where identity is trusted.
      // Log attempt/recovery references once available, not raw payloads. Alert
      // if the partition remains blocked; thresholds/routing await team review.
      this.logger.error({ ...context, event: 'run_event_not_acknowledged', stage,
        ...(stage === 'processing' && error instanceof RunEventRejectedError ? { rejectionCode: error.code } : {}),
      });
      throw error;
    }
  }

  async beforeApplicationShutdown() {
    // OBSERVABILITY PLAN: shutdown/drain duration, failures, and interrupted
    // in-flight work. Platform termination must allow the configured drain time.
    // A final stopping log is not evidence that all acknowledgements succeeded.
    this.logger.log({ event: 'status_worker_stopping' });
    await this.source.stop();
    this.logger.log({ event: 'status_worker_disconnected' });
  }
}
