import type { EventConsumer, EventMessage } from './kafka-consumer.port.js';

/** Single-partition, in-process development transport. No Kafka network traffic. */
export class MockEventConsumer implements EventConsumer {
  private connected = false;
  private topics = new Set<string>();
  private handler?: (event: EventMessage) => Promise<void>;
  private queue: EventMessage[] = [];
  private nextOffsets = new Map<string, bigint>();
  private committed = new Map<string, string>();
  private draining?: Promise<void>;

  async connect() { this.connected = true; }
  async subscribe({ topics }: { topics: string[]; fromBeginning: boolean }) {
    if (!this.connected) throw new Error('Mock consumer is disconnected');
    this.topics = new Set(topics);
  }
  async run({ eachMessage }: Parameters<EventConsumer['run']>[0]) {
    if (!this.connected) throw new Error('Mock consumer is disconnected');
    this.handler = eachMessage;
  }
  async commitOffsets(offsets: Parameters<EventConsumer['commitOffsets']>[0]) {
    if (!this.connected) throw new Error('Mock consumer is disconnected');
    for (const { topic, partition, offset } of offsets) {
      if (partition !== 0) throw new Error('Mock supports only partition zero');
      this.committed.set(topic, offset);
    }
  }
  enqueue(topic: string, value: Buffer | null) {
    if (!this.topics.has(topic)) throw new Error('Mock topic is not subscribed');
    const offset = this.nextOffsets.get(topic) ?? 0n;
    this.nextOffsets.set(topic, offset + 1n);
    this.queue.push({ topic, partition: 0, message: { offset: offset.toString(), value } });
  }
  committedOffset(topic: string) { return this.committed.get(topic); }
  get pendingCount() { return this.queue.length; }

  drain(): Promise<void> {
    if (this.draining) return this.draining;
    this.draining = this.deliver().finally(() => { this.draining = undefined; });
    return this.draining;
  }
  private async deliver() {
    if (!this.connected || !this.handler) throw new Error('Mock consumer is not running');
    while (this.queue.length) {
      const next = this.queue[0];
      await this.handler(next);
      const expected = (BigInt(next.message.offset) + 1n).toString();
      if (this.committed.get(next.topic) !== expected) throw new Error('Mock event was not acknowledged');
      this.queue.shift();
    }
    // Failed delivery stays at the head for explicit drain/retry; nothing is skipped.
  }
  async stop() {
    try { await this.draining; }
    finally { this.handler = undefined; }
  }
  async disconnect() { this.connected = false; }
}
