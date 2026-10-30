import {
  Inject,
  Injectable,
  Logger,
  Optional,
  type BeforeApplicationShutdown,
  type OnApplicationBootstrap,
} from '@nestjs/common';
import { OutboxRelay, type RelayResult } from './application/outbox-relay.js';
import { EVENT_PUBLISHER, RELAY_POLICY, type EventPublisher, type RelayPolicy } from './application/ports.js';
import { backoffDelayMs, describeError } from './domain/retry-policy.js';
import { outboxLoopFailures } from '../telemetry/metrics.js';

export interface OutboxWorkerOptions {
  pollIntervalMs: number;
  /** Start the loop on application bootstrap (false in tests that drive `tick()` directly). */
  autoStart: boolean;
}
export const OUTBOX_WORKER_OPTIONS = Symbol('OUTBOX_WORKER_OPTIONS');

type Lifecycle = Partial<{ connect(): Promise<void>; disconnect(): Promise<void> }>;

/**
 * Long-running delivery loop. Drains immediately while batches come back full, sleeps
 * `pollIntervalMs` when idle, and backs off when publishing or the database fails.
 * Shutdown waits for the in-flight batch, so no lease is abandoned mid-send.
 */
@Injectable()
export class OutboxWorker implements OnApplicationBootstrap, BeforeApplicationShutdown {
  private readonly logger = new Logger(OutboxWorker.name);
  private running = false;
  private loop?: Promise<void>;
  private wakeUp?: () => void;
  private consecutiveErrors = 0;

  constructor(
    @Inject(OutboxRelay) private readonly relay: OutboxRelay,
    @Inject(EVENT_PUBLISHER) private readonly publisher: EventPublisher & Lifecycle,
    @Inject(RELAY_POLICY) private readonly policy: RelayPolicy,
    @Optional() @Inject(OUTBOX_WORKER_OPTIONS)
    private readonly options: OutboxWorkerOptions = { pollIntervalMs: 500, autoStart: true },
  ) {}

  async onApplicationBootstrap() {
    if (this.options.autoStart) await this.start();
  }

  async start() {
    if (this.running) return;
    await this.publisher.connect?.();
    this.running = true;
    this.logger.log({ event: 'outbox_worker_started', poll_interval_ms: this.options.pollIntervalMs });
    this.loop = this.runLoop();
  }

  /** Runs one delivery pass and returns how long the loop should wait before the next one. */
  async tick(): Promise<{ result: RelayResult | null; waitMs: number }> {
    try {
      const result = await this.relay.runOnce();
      this.consecutiveErrors = 0;
      if (result.retried > 0 || result.released > 0) {
        return { result, waitMs: this.policy.backoffBaseMs };
      }
      const full = result.claimed >= this.policy.batchSize;
      return { result, waitMs: full ? 0 : this.options.pollIntervalMs };
    } catch (error) {
      // Typically the database is unavailable; nothing was leased or leases will expire.
      this.consecutiveErrors++;
      outboxLoopFailures.add(1);
      const waitMs = backoffDelayMs(this.consecutiveErrors, this.policy.backoffBaseMs, this.policy.backoffMaxMs);
      this.logger.error({
        event: 'outbox_iteration_failed',
        consecutive_errors: this.consecutiveErrors,
        retry_in_ms: waitMs,
        error: describeError(error),
      });
      return { result: null, waitMs };
    }
  }

  private async runLoop() {
    while (this.running) {
      const { waitMs } = await this.tick();
      if (this.running && waitMs > 0) await this.sleep(waitMs);
    }
  }

  private sleep(ms: number) {
    return new Promise<void>((resolve) => {
      const timer = setTimeout(done, ms);
      this.wakeUp = done;
      function done() {
        clearTimeout(timer);
        resolve();
      }
    }).finally(() => {
      this.wakeUp = undefined;
    });
  }

  /** Wake the loop early (e.g. after enqueueing in the same process). */
  poke() {
    this.wakeUp?.();
  }

  async stop() {
    if (!this.running) return;
    this.running = false;
    this.wakeUp?.();
    await this.loop;
    await this.publisher.disconnect?.();
    this.logger.log({ event: 'outbox_worker_stopped' });
  }

  get isRunning() {
    return this.running;
  }

  async beforeApplicationShutdown() {
    await this.stop();
  }
}
