import { PublishError, type EventPublisher } from '../../../src/outbox/application/ports.js';
import type { OutboxMessage } from '../../../src/outbox/domain/outbox-message.js';

/** Stand-in broker for in-process module tests. */
export class FakeKafka implements EventPublisher {
  readonly delivered: OutboxMessage[] = [];
  attempts = 0;
  connected = false;
  connectCalls = 0;
  disconnectCalls = 0;
  /** While set, every publish fails with this error. */
  outage: PublishError | null = null;

  async connect() {
    this.connectCalls++;
    this.connected = true;
  }

  async disconnect() {
    this.disconnectCalls++;
    this.connected = false;
  }

  async publish(message: OutboxMessage) {
    this.attempts++;
    if (!this.connected) throw new PublishError('producer not connected', true);
    if (this.outage) throw this.outage;
    this.delivered.push(structuredClone(message));
  }

  goDown(retriable = true, message = 'broker unavailable') {
    this.outage = new PublishError(message, retriable);
  }

  recover() {
    this.outage = null;
  }

  byTopic(topic: string) {
    return this.delivered.filter((m) => m.topic === topic);
  }
}
