import { Logger } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { EventMessage } from './kafka-consumer.port.js';
import { ProcessRunEventUseCase } from '../application/process-run-event.use-case.js';
import { RunNotFoundError } from '../application/ports/run-event.repository.js';
import { StatusWorker } from '../application/status-worker.js';
import { KafkaEventSource } from './kafka-event-source.js';
import { readKafkaConfig } from './kafka.config.js';
import { RunIdentityMismatchError } from '../domain/apply-run-event.js';

function fixture() {
  const consumer = {
    connect: vi.fn(), subscribe: vi.fn(), run: vi.fn(), commitOffsets: vi.fn(),
    stop: vi.fn(), disconnect: vi.fn(),
  };
  const repository = { apply: vi.fn().mockResolvedValue('updated') };
  // Only the Kafka methods exercised by this worker are mocked.
  const source = new KafkaEventSource(consumer, readKafkaConfig({}));
  const worker = new StatusWorker(source, new ProcessRunEventUseCase(repository));
  const payload: EventMessage = {
    topic: 'run.status', partition: 0,
    message: { offset: '9007199254740993', value: Buffer.from(JSON.stringify({
      event_type: 'run.status', correlation_id: 'cid', run_id: 'emu',
      engine: 'emulator', sequence: 1, status: 'running', emitted_at: '2026-10-09T12:53:00Z',
    })) },
  };
  return { consumer, repository, worker, payload, source };
}

describe('Kafka event source with StatusWorker', () => {
  it('connects and subscribes before starting with manual commits', async () => {
    const { consumer, worker } = fixture();
    await worker.onModuleInit();
    expect(consumer.subscribe).toHaveBeenCalledWith({ topics: ['run.response'], fromBeginning: true });
    expect(consumer.run).toHaveBeenCalledWith({ autoCommit: false, eachMessage: expect.any(Function) });
  });
  it.each(['updated', 'ignored', 'held'])('acknowledges %s events only after persistence', async (outcome) => {
    const { consumer, repository, worker, payload, source } = fixture();
    repository.apply.mockImplementation(async () => {
      expect(consumer.commitOffsets).not.toHaveBeenCalled();
      return outcome;
    });
    await worker.handleMessage(source.toDelivery(payload));
    expect(consumer.commitOffsets).toHaveBeenCalledWith([{ topic: 'run.status', partition: 0, offset: '9007199254740994' }]);
  });
  it.each([new Error('DB unavailable'), new RunNotFoundError()])('does not acknowledge persistence failures', async (error) => {
    const { consumer, repository, worker, payload, source } = fixture();
    const log = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    repository.apply.mockRejectedValue(error);
    await expect(worker.handleMessage(source.toDelivery(payload))).rejects.toBe(error);
    expect(consumer.commitOffsets).not.toHaveBeenCalled();
    log.mockRestore();
  });
  it('does not acknowledge invalid messages or call the repository', async () => {
    const { consumer, repository, worker, payload, source } = fixture();
    const log = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    payload.message.value = Buffer.from('{');
    await expect(worker.handleMessage(source.toDelivery(payload))).rejects.toThrow('Invalid run event');
    expect(repository.apply).not.toHaveBeenCalled();
    expect(consumer.commitOffsets).not.toHaveBeenCalled();
    log.mockRestore();
  });
  it.each([
    [new RunNotFoundError(), 'unknown_correlation'],
    [new RunIdentityMismatchError('engine_mismatch'), 'engine_mismatch'],
    [new RunIdentityMismatchError(), 'engine_run_id_mismatch'],
  ])('propagates classified rejection without acknowledgement', async (error, rejectionCode) => {
    const { consumer, repository, worker, payload, source } = fixture();
    const log = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    repository.apply.mockRejectedValue(error);
    try {
      await expect(worker.handleMessage(source.toDelivery(payload))).rejects.toBe(error);
      expect(consumer.commitOffsets).not.toHaveBeenCalled();
      expect(log).toHaveBeenCalledWith({ topic: payload.topic, partition: payload.partition,
        offset: payload.message.offset, event: 'run_event_not_acknowledged', stage: 'processing', rejectionCode });
    } finally { log.mockRestore(); }
  });
  it.each(['database', 'acknowledgement'])('does not mislabel a %s failure as invalid engine input', async (stage) => {
    const { consumer, repository, worker, payload, source } = fixture();
    const log = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    const error = new Error('sensitive infrastructure details');
    if (stage === 'database') repository.apply.mockRejectedValue(error);
    else consumer.commitOffsets.mockRejectedValue(error);
    try {
      await expect(worker.handleMessage(source.toDelivery(payload))).rejects.toBe(error);
      expect(log).toHaveBeenCalledWith({ topic: payload.topic, partition: payload.partition,
        offset: payload.message.offset, event: 'run_event_not_acknowledged',
        stage: stage === 'database' ? 'processing' : 'acknowledgement' });
      expect(JSON.stringify(log.mock.calls)).not.toContain('sensitive infrastructure details');
    } finally { log.mockRestore(); }
  });
  it('propagates commit failures for replay', async () => {
    const { consumer, worker, payload, source } = fixture();
    const log = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    consumer.commitOffsets.mockRejectedValue(new Error('commit failed'));
    await expect(worker.handleMessage(source.toDelivery(payload))).rejects.toThrow('commit failed');
    log.mockRestore();
  });
  it('disconnects on startup failure', async () => {
    const { consumer, worker } = fixture();
    consumer.subscribe.mockRejectedValue(new Error('subscribe failed'));
    await expect(worker.onModuleInit()).rejects.toThrow('subscribe failed');
    expect(consumer.disconnect).toHaveBeenCalledOnce();
  });
  it('preserves the startup error if disconnect also fails', async () => {
    const { consumer, worker } = fixture();
    const error = new Error('subscription failed');
    const log = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    consumer.subscribe.mockRejectedValue(error);
    consumer.disconnect.mockRejectedValue(new Error('disconnect failed'));
    try {
      await expect(worker.onModuleInit()).rejects.toBe(error);
      expect(log).toHaveBeenCalledWith({ event: 'event_source_startup_cleanup_failed', source: 'kafka' });
    } finally { log.mockRestore(); }
  });
  it('still disconnects when draining fails', async () => {
    const { consumer, worker } = fixture();
    consumer.stop.mockRejectedValue(new Error('drain failed'));
    await expect(worker.beforeApplicationShutdown()).rejects.toThrow('drain failed');
    expect(consumer.disconnect).toHaveBeenCalledOnce();
  });
  it('drains before disconnecting', async () => {
    const { consumer, worker } = fixture();
    consumer.stop.mockImplementation(async () => { expect(consumer.disconnect).not.toHaveBeenCalled(); });
    await worker.beforeApplicationShutdown();
    expect(consumer.stop).toHaveBeenCalledOnce();
    expect(consumer.disconnect).toHaveBeenCalledOnce();
  });
  it('does nothing when disabled', async () => {
    const worker = new StatusWorker(new KafkaEventSource(null, readKafkaConfig({})), new ProcessRunEventUseCase({ apply: vi.fn() }));
    await worker.onModuleInit();
    await worker.beforeApplicationShutdown();
  });
});

describe('Kafka configuration', () => {
  it('defaults to disabled', () => { expect(readKafkaConfig({}).enabled).toBe(false); });
  it('parses brokers and TLS credentials', () => {
    expect(readKafkaConfig({ STATUS_WORKER_ENABLED: 'true', KAFKA_BROKERS: 'a:9092, b:9092', KAFKA_SSL: 'true', KAFKA_USERNAME: 'user', KAFKA_PASSWORD: 'secret' }))
      .toMatchObject({ enabled: true, brokers: ['a:9092', 'b:9092'], ssl: true });
  });
  it.each([
    { STATUS_WORKER_ENABLED: 'true' }, { STATUS_WORKER_ENABLED: 'yes' },
    { KAFKA_USERNAME: 'user' }, { KAFKA_USERNAME: 'user', KAFKA_PASSWORD: 'secret' },
    { KAFKA_STATUS_TOPIC: 'bad topic' },
  ])('rejects invalid configuration', (env) => { expect(() => readKafkaConfig(env)).toThrow(); });
});
