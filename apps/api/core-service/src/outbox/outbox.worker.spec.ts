import { afterEach, describe, expect, it, vi } from 'vitest';
import type { OutboxRelay, RelayResult } from './application/outbox-relay.js';
import type { EventPublisher, RelayPolicy } from './application/ports.js';
import { OutboxWorker } from './outbox.worker.js';

const policy: RelayPolicy = { batchSize: 2, leaseMs: 1000, backoffBaseMs: 40, backoffMaxMs: 80, maxAttempts: 0 };
const empty: RelayResult = { claimed: 0, published: 0, retried: 0, dead: 0, released: 0, leaseLost: 0 };

function setup(results: (Partial<RelayResult> | Error)[], pollIntervalMs = 20) {
  const calls: number[] = [];
  const relay = {
    runOnce: vi.fn(async () => {
      calls.push(Date.now());
      const next = results.length ? results.shift()! : {};
      if (next instanceof Error) throw next;
      return { ...empty, ...next };
    }),
  } as unknown as OutboxRelay & { runOnce: ReturnType<typeof vi.fn> };
  const publisher = {
    publish: vi.fn(),
    connect: vi.fn(async () => {}),
    disconnect: vi.fn(async () => {}),
  };
  const worker = new OutboxWorker(relay, publisher as EventPublisher & typeof publisher, policy, {
    pollIntervalMs,
    autoStart: false,
  });
  return { worker, relay, publisher, calls };
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('OutboxWorker.tick', () => {
  it('waits the poll interval when idle', async () => {
    const { worker } = setup([{ claimed: 1, published: 1 }]);
    expect((await worker.tick()).waitMs).toBe(20);
  });

  it('drains immediately when the batch was full', async () => {
    const { worker } = setup([{ claimed: 2, published: 2 }]);
    expect((await worker.tick()).waitMs).toBe(0);
  });

  it('backs off after publish failures', async () => {
    const { worker } = setup([{ claimed: 2, retried: 1, released: 1 }]);
    expect((await worker.tick()).waitMs).toBe(40);
  });

  it('survives relay errors with growing, capped backoff and resets on success', async () => {
    const { worker } = setup([new Error('db down'), new Error('db down'), new Error('db down'), {}]);
    const waits: number[] = [];
    for (let i = 0; i < 4; i++) waits.push((await worker.tick()).waitMs);
    expect(waits[0]).toBeGreaterThanOrEqual(20);
    expect(waits[0]).toBeLessThanOrEqual(40);
    expect(waits[2]).toBeLessThanOrEqual(80);
    expect(waits[3]).toBe(20);
  });
});

describe('OutboxWorker lifecycle', () => {
  let stop: (() => Promise<void>) | undefined;
  afterEach(async () => {
    await stop?.();
    stop = undefined;
  });

  it('does not start on bootstrap when autoStart is false', async () => {
    const { worker, publisher } = setup([]);
    await worker.onApplicationBootstrap();
    expect(worker.isRunning).toBe(false);
    expect(publisher.connect).not.toHaveBeenCalled();
  });

  it('connects, polls repeatedly, and disconnects on shutdown', async () => {
    const { worker, relay, publisher } = setup([]);
    stop = () => worker.beforeApplicationShutdown();
    await worker.start();
    await worker.start(); // idempotent
    expect(publisher.connect).toHaveBeenCalledTimes(1);
    await wait(90);
    expect(relay.runOnce.mock.calls.length).toBeGreaterThanOrEqual(2);

    await worker.beforeApplicationShutdown();
    const callsAtStop = relay.runOnce.mock.calls.length;
    expect(worker.isRunning).toBe(false);
    expect(publisher.disconnect).toHaveBeenCalledTimes(1);
    await wait(60);
    expect(relay.runOnce.mock.calls.length).toBe(callsAtStop);
  });

  it('poke wakes an idle loop early', async () => {
    const { worker, relay } = setup([], 10_000);
    stop = () => worker.stop();
    await worker.start();
    await wait(20);
    expect(relay.runOnce).toHaveBeenCalledTimes(1);
    worker.poke();
    await wait(20);
    expect(relay.runOnce).toHaveBeenCalledTimes(2);
  });

  it('stop interrupts a long idle sleep promptly', async () => {
    const { worker } = setup([], 60_000);
    await worker.start();
    await wait(10);
    const started = Date.now();
    await worker.stop();
    expect(Date.now() - started).toBeLessThan(500);
  });

  it('fails start when the producer cannot connect', async () => {
    const { worker, publisher } = setup([]);
    publisher.connect.mockRejectedValueOnce(new Error('no brokers'));
    await expect(worker.start()).rejects.toThrow('no brokers');
    expect(worker.isRunning).toBe(false);
  });
});
