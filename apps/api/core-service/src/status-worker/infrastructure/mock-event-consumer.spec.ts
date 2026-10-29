import { seed } from '../../../test/fixtures/run-state.js';
import { readFile } from 'node:fs/promises';
import { Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { run } from '../../db/schema/run.js';
import { ProcessRunEventUseCase } from '../application/process-run-event.use-case.js';
import { runEventSchema } from '../domain/run-event.js';
import { InMemoryRunEventRepository } from './in-memory-run-event.repository.js';
import { StatusWorker } from '../application/status-worker.js';
import { KafkaEventSource } from './kafka-event-source.js';
import { readKafkaConfig } from './kafka.config.js';
import { MockEventConsumer } from './mock-event-consumer.js';

const row: typeof run.$inferSelect = {
  ...seed, retryOfRunId: null, id: 'id', scenarioId: 'scenario', correlationId: 'mock-correlation-1',
  engine: 'emulator', engineRunId: null, status: 'accepted', verdict: null,
  reason: null, results: {}, engineRef: null, statusMessage: null,
  statusEventAt: null, resultEventAt: null, priority: 'normal', triggeredBy: null, mapVersion: null, sizerVersion: null, configSnapshotUri: null, idempotencyKey: null, requestHash: null, completedAt: null,
  createdAt: new Date(), updatedAt: new Date(),
};
const event = {
  event_type: 'run.status', correlation_id: row.correlationId, run_id: 'engine-run',
  engine: 'emulator', sequence: 1, status: 'running', emitted_at: '2026-10-09T12:53:00Z',
};

async function fixture() {
  const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
  vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  const consumer = new MockEventConsumer();
  const repository = new InMemoryRunEventRepository([row], [{ id: row.scenarioId, currentRunId: row.id, status: 'running' }]);
  const worker = new StatusWorker(new KafkaEventSource(consumer, readKafkaConfig({ KAFKA_STATUS_TOPIC: 'run.status', KAFKA_RESULT_TOPIC: 'run.result' })), new ProcessRunEventUseCase(repository));
  await worker.onModuleInit();
  return { consumer, repository, worker, log };
}

afterEach(() => vi.restoreAllMocks());

describe('mock transport through the real worker', () => {
  it('logs receipt, persisted outcome, and acknowledgement in order without payload contents', async () => {
    const { consumer, worker, log } = await fixture();
    log.mockClear();
    consumer.enqueue('run.status', Buffer.from(JSON.stringify({ ...event, message: 'private message body' })));
    await consumer.drain();
    expect(log.mock.calls.map(([entry]) => entry.event)).toEqual([
      'run_event_received', 'run_event_processed', 'run_event_acknowledged',
    ]);
    expect(log).toHaveBeenCalledWith(expect.objectContaining({
      event: 'run_event_processed', correlationId: row.correlationId, outcome: 'updated',
    }));
    expect(JSON.stringify(log.mock.calls)).not.toContain('private message body');
    await worker.beforeApplicationShutdown();
  });
  it('logs commit failures without falsely reporting acknowledgement or exposing the error', async () => {
    const { consumer, worker, log } = await fixture();
    vi.spyOn(consumer, 'commitOffsets').mockRejectedValueOnce(new Error('secret connection details'));
    consumer.enqueue('run.status', Buffer.from(JSON.stringify(event)));
    await expect(consumer.drain()).rejects.toThrow();
    expect(Logger.prototype.error).toHaveBeenCalledWith({
      event: 'run_event_not_acknowledged', topic: 'run.status', partition: 0,
      offset: '0', stage: 'acknowledgement',
    });
    expect(log.mock.calls.some(([entry]) => entry.event === 'run_event_acknowledged')).toBe(false);
    expect(JSON.stringify(vi.mocked(Logger.prototype.error).mock.calls)).not.toContain('secret connection details');
    await worker.beforeApplicationShutdown();
  });
  it('replays the sample lifecycle and results without Kafka or PostgreSQL', async () => {
    const { consumer, repository, worker } = await fixture();
    const input: unknown = JSON.parse(await readFile('test/fixtures/run-events.json', 'utf8'));
    const events = runEventSchema.array().parse(input);
    for (const e of events) consumer.enqueue(e.event_type, Buffer.from(JSON.stringify(e)));
    await consumer.drain();
    expect(consumer.pendingCount).toBe(0);
    expect(consumer.committedOffset('run.status')).toBe('4');
    expect(consumer.committedOffset('run.result')).toBe('1');
    expect(repository.snapshot()[0]).toMatchObject({
      status: 'completed', verdict: null, engineRunId: 'mock-engine-run-1',
      results: { throughput_uph: 2840 },
    });
    await worker.beforeApplicationShutdown();
  });
  it('keeps failed messages pending and retries the same offset', async () => {
    const { consumer, repository, worker } = await fixture();
    const apply = vi.spyOn(repository, 'apply').mockRejectedValueOnce(new Error('DB unavailable'));
    consumer.enqueue('run.status', Buffer.from(JSON.stringify(event)));
    await expect(consumer.drain()).rejects.toThrow('DB unavailable');
    expect(consumer.pendingCount).toBe(1);
    expect(consumer.committedOffset('run.status')).toBeUndefined();
    await consumer.drain();
    expect(apply).toHaveBeenCalledTimes(2);
    expect(consumer.committedOffset('run.status')).toBe('1');
    await worker.beforeApplicationShutdown();
  });
  it('safely replays after a DB success followed by an offset commit failure', async () => {
    const { consumer, repository, worker } = await fixture();
    vi.spyOn(consumer, 'commitOffsets').mockRejectedValueOnce(new Error('commit failed'));
    consumer.enqueue('run.status', Buffer.from(JSON.stringify(event)));
    await expect(consumer.drain()).rejects.toThrow('commit failed');
    const saved = repository.snapshot();
    await consumer.drain();
    expect(repository.snapshot()).toEqual(saved);
    expect(consumer.committedOffset('run.status')).toBe('1');
    await worker.beforeApplicationShutdown();
  });
  it('does not skip an invalid message to acknowledge later records', async () => {
    const { consumer, repository, worker } = await fixture();
    consumer.enqueue('run.status', Buffer.from('{'));
    consumer.enqueue('run.status', Buffer.from(JSON.stringify(event)));
    await expect(consumer.drain()).rejects.toThrow('Invalid run event');
    expect(consumer.pendingCount).toBe(2);
    expect(repository.snapshot()[0].status).toBe('accepted');
    expect(consumer.committedOffset('run.status')).toBeUndefined();
    await worker.beforeApplicationShutdown();
  });
  it('serializes concurrent drain calls', async () => {
    const { consumer, repository, worker } = await fixture();
    const apply = vi.spyOn(repository, 'apply');
    consumer.enqueue('run.status', Buffer.from(JSON.stringify(event)));
    await Promise.all([consumer.drain(), consumer.drain()]);
    expect(apply).toHaveBeenCalledOnce();
    await worker.beforeApplicationShutdown();
  });
  it('rejects unsubscribed topics and draining after shutdown', async () => {
    const { consumer, worker } = await fixture();
    expect(() => consumer.enqueue('unknown', null)).toThrow('not subscribed');
    await worker.beforeApplicationShutdown();
    await expect(consumer.drain()).rejects.toThrow('not running');
  });
});
