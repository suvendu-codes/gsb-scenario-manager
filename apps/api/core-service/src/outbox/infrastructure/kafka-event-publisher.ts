import { Injectable, Logger } from '@nestjs/common';
import { Kafka, logLevel, type KafkaConfig, type Producer, type SASLOptions } from 'kafkajs';
import { PublishError, type EventPublisher } from '../application/ports.js';
import type { OutboxMessage } from '../domain/outbox-message.js';

export interface KafkaPublisherConfig {
  brokers: readonly string[];
  clientId: string;
  ssl: boolean;
  sasl: {
    mechanism: 'plain' | 'scram-sha-256' | 'scram-sha-512';
    username?: string;
    password?: string;
  };
  /** Upper bound for one publish, including producer retries. Default 30s. */
  sendTimeoutMs?: number;
}

export const DEFAULT_SEND_TIMEOUT_MS = 30_000;
const SEND_RETRIES = 2;
const MAX_RETRY_BACKOFF_MS = 1_000;

/**
 * Producer timings derived from the send budget so that the worst case — every attempt timing
 * out, plus the backoff between them — fits inside `sendTimeoutMs`. The relay renews a row's lease
 * right before sending and config requires lease ≥ 2 × send budget, so a send can never outlive
 * its lease and be repeated by another worker while still in flight.
 */
export function sendTimings(sendTimeoutMs = DEFAULT_SEND_TIMEOUT_MS) {
  const attempts = SEND_RETRIES + 1;
  const requestTimeoutMs = Math.max(1_000, Math.floor((sendTimeoutMs - SEND_RETRIES * MAX_RETRY_BACKOFF_MS) / attempts));
  return {
    requestTimeoutMs,
    connectionTimeoutMs: Math.min(10_000, requestTimeoutMs),
    retry: { retries: SEND_RETRIES, initialRetryTime: 200, maxRetryTime: MAX_RETRY_BACKOFF_MS },
  };
}

/**
 * kafkajs reports exhausted internal retries as KafkaJSNumberOfRetriesExceeded (retriable=false)
 * even when the root cause is a broker outage. Classify by the innermost KafkaJS error instead,
 * so outages are retried while e.g. MESSAGE_TOO_LARGE goes straight to `dead`.
 */
export function isRetriableKafkaError(error: unknown): boolean {
  let current = error as { name?: string; retriable?: boolean; cause?: unknown } | undefined;
  for (let depth = 0; depth < 5 && current; depth++) {
    const wrapper =
      current.name === 'KafkaJSNumberOfRetriesExceeded' ||
      (current.name === 'KafkaJSNonRetriableError' && current.cause !== undefined);
    if (wrapper && current.cause && typeof current.cause === 'object') {
      current = current.cause as typeof current;
      continue;
    }
    return current.retriable !== false;
  }
  return true;
}

export function toKafkaConfig(config: KafkaPublisherConfig): KafkaConfig {
  const { username, password, mechanism } = config.sasl;
  return {
    clientId: config.clientId,
    brokers: [...config.brokers],
    ssl: config.ssl,
    sasl: username && password ? ({ mechanism, username, password } as SASLOptions) : undefined,
    connectionTimeout: sendTimings(config.sendTimeoutMs).connectionTimeoutMs,
    requestTimeout: sendTimings(config.sendTimeoutMs).requestTimeoutMs,
    logLevel: logLevel.WARN,
  };
}

@Injectable()
export class KafkaEventPublisher implements EventPublisher {
  private readonly logger = new Logger(KafkaEventPublisher.name);
  private readonly producer: Producer;
  private connected = false;

  constructor(
    private readonly config: KafkaPublisherConfig,
    kafka: Pick<Kafka, 'producer'> = new Kafka(toKafkaConfig(config)),
  ) {
    this.producer = kafka.producer({
      allowAutoTopicCreation: false,
      // One in-flight request keeps per-partition order across internal retries.
      maxInFlightRequests: 1,
      retry: sendTimings(config.sendTimeoutMs).retry,
    });
  }

  async connect() {
    if (this.connected) return;
    await this.producer.connect();
    this.connected = true;
    this.logger.log({ event: 'outbox_producer_connected', brokers: this.config.brokers });
  }

  async disconnect() {
    if (!this.connected) return;
    this.connected = false;
    await this.producer.disconnect();
  }

  async publish(message: OutboxMessage): Promise<void> {
    const budget = this.config.sendTimeoutMs ?? DEFAULT_SEND_TIMEOUT_MS;
    let timer: NodeJS.Timeout | undefined;
    // Last-resort guard: the producer is tuned to finish within the budget; never wait past it.
    const guard = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new PublishError(`send exceeded ${budget}ms`, true)), budget);
    });
    try {
      await Promise.race([this.send(message), guard]);
    } finally {
      clearTimeout(timer);
    }
  }

  private async send(message: OutboxMessage): Promise<void> {
    try {
      await this.producer.send({
        topic: message.topic,
        acks: -1,
        // Broker-side wait for acks=all; same as one request's client timeout.
        timeout: sendTimings(this.config.sendTimeoutMs).requestTimeoutMs,
        messages: [
          {
            key: message.messageKey,
            value: JSON.stringify(message.payload),
            headers: message.headers,
          },
        ],
      });
    } catch (error) {
      throw new PublishError(
        error instanceof Error ? error.message : String(error),
        isRetriableKafkaError(error),
        { cause: error },
      );
    }
  }
}
