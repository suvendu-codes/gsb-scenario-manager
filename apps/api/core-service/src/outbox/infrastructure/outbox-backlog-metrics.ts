import { Inject, Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import type { BatchObservableResult } from '@opentelemetry/api';
import { meter, outboxOldestPendingAge, outboxPending } from '../../telemetry/metrics.js';
import { OUTBOX_STORE, type OutboxStore } from '../application/ports.js';

/**
 * Exports the outbox backlog (rows waiting, age of the oldest) as gauges.
 *
 * The OTel SDK calls the callback once per export interval (60s by default), so this costs one
 * small indexed query per interval per worker replica. Both gauges come from one query.
 * A growing pending count or oldest age means commands are not reaching the broker.
 */
@Injectable()
export class OutboxBacklogMetrics implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxBacklogMetrics.name);
  private readonly observe = async (result: BatchObservableResult) => {
    try {
      const stats = await this.store.stats?.();
      if (!stats) return;
      result.observe(outboxPending, stats.pending);
      result.observe(outboxOldestPendingAge, stats.oldestPendingAgeSeconds);
    } catch (error) {
      // Skipping one sample is better than failing the export; the gap itself is visible.
      this.logger.warn({
        event: 'outbox_backlog_metrics_failed',
        error: error instanceof Error ? error.name : 'Error',
      });
    }
  };

  constructor(@Inject(OUTBOX_STORE) private readonly store: OutboxStore) {}

  onModuleInit() {
    meter.addBatchObservableCallback(this.observe, [outboxPending, outboxOldestPendingAge]);
  }

  onModuleDestroy() {
    meter.removeBatchObservableCallback(this.observe, [outboxPending, outboxOldestPendingAge]);
  }
}
