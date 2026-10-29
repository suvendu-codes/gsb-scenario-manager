import { describe, expect, it, vi } from 'vitest';
import type { Kafka } from 'kafkajs';
import { outboxMessage } from '../../../test/fixtures/trigger.js';
import { PublishError } from '../application/ports.js';
import {
  isRetriableKafkaError,
  KafkaEventPublisher,
  toKafkaConfig,
  type KafkaPublisherConfig,
} from './kafka-event-publisher.js';

const config: KafkaPublisherConfig = {
  brokers: ['k1:9092', 'k2:9092'],
  clientId: 'sm-outbox',
  ssl: false,
  sasl: { mechanism: 'plain' },
};

function fakeKafka(send = vi.fn(async () => [])) {
  const producer = { connect: vi.fn(async () => {}), disconnect: vi.fn(async () => {}), send };
  const kafka = { producer: vi.fn(() => producer) };
  return { kafka: kafka as unknown as Pick<Kafka, 'producer'>, producer, factory: kafka };
}

const kafkaError = (name: string, retriable: boolean, cause?: unknown) =>
  Object.assign(new Error(name), { name, retriable, cause });

describe('KafkaEventPublisher', () => {
  it('creates an ordered, non-auto-creating producer', () => {
    const { kafka, factory } = fakeKafka();
    new KafkaEventPublisher(config, kafka);
    expect(factory.producer).toHaveBeenCalledWith(
      expect.objectContaining({ allowAutoTopicCreation: false, maxInFlightRequests: 1 }),
    );
  });

  it('sends the stored payload keyed by correlation_id with acks=all and headers', async () => {
    const { kafka, producer } = fakeKafka();
    const publisher = new KafkaEventPublisher(config, kafka);
    const message = outboxMessage({ headers: { event_id: 'o-1', event_type: 'run.trigger' } });

    await publisher.publish(message);

    expect(producer.send).toHaveBeenCalledTimes(1);
    expect(producer.send).toHaveBeenCalledWith({
      topic: message.topic,
      acks: -1,
      timeout: 30_000,
      messages: [
        {
          key: 'cid_test',
          value: JSON.stringify(message.payload),
          headers: { event_id: 'o-1', event_type: 'run.trigger' },
        },
      ],
    });
  });

  it('wraps retriable broker errors', async () => {
    const send = vi.fn(async () => {
      throw kafkaError('KafkaJSConnectionError', true);
    });
    const publisher = new KafkaEventPublisher(config, fakeKafka(send).kafka);
    const error = await publisher.publish(outboxMessage()).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(PublishError);
    expect((error as PublishError).retriable).toBe(true);
    expect((error as PublishError).cause).toBeDefined();
  });

  it('wraps non-retriable broker errors', async () => {
    const send = vi.fn(async () => {
      throw kafkaError('KafkaJSProtocolError', false);
    });
    const publisher = new KafkaEventPublisher(config, fakeKafka(send).kafka);
    await expect(publisher.publish(outboxMessage())).rejects.toMatchObject({ retriable: false });
  });

  it('connects and disconnects once', async () => {
    const { kafka, producer } = fakeKafka();
    const publisher = new KafkaEventPublisher(config, kafka);
    await publisher.connect();
    await publisher.connect();
    await publisher.disconnect();
    await publisher.disconnect();
    expect(producer.connect).toHaveBeenCalledTimes(1);
    expect(producer.disconnect).toHaveBeenCalledTimes(1);
  });
});

describe('isRetriableKafkaError', () => {
  it('uses the retriable flag of plain errors', () => {
    expect(isRetriableKafkaError(kafkaError('KafkaJSConnectionError', true))).toBe(true);
    expect(isRetriableKafkaError(kafkaError('KafkaJSProtocolError', false))).toBe(false);
  });

  it('looks through exhausted-retry wrappers to the root cause', () => {
    const outage = kafkaError('KafkaJSNumberOfRetriesExceeded', false, kafkaError('KafkaJSConnectionError', true));
    const tooLarge = kafkaError('KafkaJSNumberOfRetriesExceeded', false, kafkaError('KafkaJSProtocolError', false));
    expect(isRetriableKafkaError(outage)).toBe(true);
    expect(isRetriableKafkaError(tooLarge)).toBe(false);
  });

  it('defaults to retriable for unknown errors', () => {
    expect(isRetriableKafkaError(new Error('?'))).toBe(true);
    expect(isRetriableKafkaError(undefined)).toBe(true);
  });
});

describe('toKafkaConfig', () => {
  it('omits SASL without credentials', () => {
    expect(toKafkaConfig(config)).toMatchObject({ clientId: 'sm-outbox', brokers: ['k1:9092', 'k2:9092'], ssl: false });
    expect(toKafkaConfig(config).sasl).toBeUndefined();
  });

  it('enables SASL with credentials', () => {
    const sasl = toKafkaConfig({ ...config, ssl: true, sasl: { mechanism: 'scram-sha-512', username: 'u', password: 'p' } });
    expect(sasl.ssl).toBe(true);
    expect(sasl.sasl).toEqual({ mechanism: 'scram-sha-512', username: 'u', password: 'p' });
  });
});
