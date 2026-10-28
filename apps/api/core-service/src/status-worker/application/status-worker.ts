import { Inject, Injectable, Logger, type OnModuleInit, type BeforeApplicationShutdown } from '@nestjs/common';
import { EVENT_SOURCE, type EventDelivery, type EventSource } from './ports/event-source.js';
import { ProcessRunEventUseCase } from './process-run-event.use-case.js';
import { RunEventRejectedError } from '../domain/run-event-rejection.js';

/**
 * The orchestrator: it connects "a message arrived" to "process it, then acknowledge it".
 *
 * Reading guide (the order things happen):
 *   1. onModuleInit()  - Nest calls this once at startup => asks the event source to start and
 *                        gives it handleMessage() as the callback. (Entry: worker-main.ts / app.module.ts)
 *   2. handleMessage() - called by Kafka for EVERY message:
 *        a. processEvent.execute()  parse + validate + save to PostgreSQL   (one DB transaction)
 *        b. delivery.acknowledge()  tell Kafka we are done (commit offset)  (only if (a) succeeded)
 *        c. any exception           log it and RE-THROW => message stays unacknowledged => redelivered
 *   3. beforeApplicationShutdown() - on SIGTERM/SIGINT: stop consuming cleanly.
 *
 * `@Injectable()` / `@Inject(...)` are NestJS decorators: they tell Nest "build this class for me and
 * pass these constructor arguments in" (dependency injection). Nothing here is called manually.
 */
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
      // Step A: validate and persist. Resolves 'updated' | 'ignored' | 'held' only AFTER the DB
      // transaction committed. Throws for anything we must not silently skip (bad JSON, unknown
      // run, identity mismatch, DB down, ...).
      const outcome = await this.processEvent.execute(delivery.body);
      // Step B: the data is safe in PostgreSQL, so now it is OK to tell Kafka we are done.
      // If the process dies exactly here, Kafka redelivers and the duplicate is detected (no harm).
      // 'ignored' and 'held' outcomes are acknowledged too: they are intentional, durable results.
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
