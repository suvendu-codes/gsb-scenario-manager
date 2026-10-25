import { seed as contractSeed } from '../../test/fixtures/run-state.js';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RunState } from '../runs/domain/run-state.js';
import { EVENT_SOURCE, type EventDelivery, type EventSource } from './application/ports/event-source.js';
import { RUN_EVENT_REPOSITORY, type RunEventRepository } from './application/ports/run-event.repository.js';
import { InMemoryRunEventRepository } from './infrastructure/in-memory-run-event.repository.js';
import { StatusWorkerModule } from './status-worker.module.js';

/** Deliberately has no topic, partition, offset, or Kafka client. */
class PushSource implements EventSource {
  handler?: (delivery: EventDelivery) => Promise<void>;
  async start(handler: (delivery: EventDelivery) => Promise<void>) { this.handler = handler; }
  async stop() { this.handler = undefined; }
  async send(delivery: EventDelivery) {
    if (!this.handler) throw new Error('Source not started');
    await this.handler(delivery);
  }
}

const seed: RunState = {
  ...contractSeed, id: 'id', scenarioId: 'scenario', correlationId: 'cid', engine: 'emulator',
  engineRunId: null, status: 'accepted', verdict: null, reason: null,
  results: {}, engineRef: null, statusMessage: null, statusEventAt: null,
  resultEventAt: null, createdAt: new Date(), updatedAt: new Date(), completedAt: null,
};

function delivery() {
  return {
    body: Buffer.from(JSON.stringify({
      event_type: 'run.status', correlation_id: 'cid', run_id: 'engine-id',
      engine: 'emulator', sequence: 1, status: 'running', emitted_at: '2026-10-09T12:53:00Z',
    })),
    context: { source: 'test-push', deliveryId: 'delivery-1' },
    acknowledge: vi.fn(async () => {}),
  };
}

afterEach(() => vi.restoreAllMocks());

describe('replaceable status worker adapters', () => {
  it('boots with a non-Kafka source and factory-created storage, processes and drains', async () => {
    const store = new InMemoryRunEventRepository([seed], [{ id: seed.scenarioId, currentRunId: seed.id, status: 'running' }]);
    const app = await NestFactory.createApplicationContext(StatusWorkerModule.register({
      eventSource: { useClass: PushSource },
      runRepository: { useFactory: () => store },
    }), { logger: false, abortOnError: false });
    const source = app.get<PushSource>(EVENT_SOURCE);
    try {
      expect(app.get<RunEventRepository>(RUN_EVENT_REPOSITORY)).toBe(store);
      const message = delivery();
      message.acknowledge.mockImplementation(async () => {
        expect(store.snapshot()[0].status).toBe('running');
      });
      await source.send(message);
      expect(message.acknowledge).toHaveBeenCalledOnce();
    } finally { await app.close(); }
    expect(source.handler).toBeUndefined();
  });

  it('can independently replace storage without changing the source or worker', async () => {
    const source = new PushSource();
    const repository: RunEventRepository = {
      apply: vi.fn().mockRejectedValue(new Error('Alternate store unavailable')),
    };
    const app = await NestFactory.createApplicationContext(StatusWorkerModule.register({
      eventSource: { useValue: source },
      runRepository: { useValue: repository },
    }), { logger: false, abortOnError: false });
    try {
      const message = delivery();
      await expect(source.send(message)).rejects.toThrow('Alternate store unavailable');
      expect(message.acknowledge).not.toHaveBeenCalled();
      expect(repository.apply).toHaveBeenCalledOnce();
    } finally { await app.close(); }
  });
});
