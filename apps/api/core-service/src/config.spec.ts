import { describe, expect, it } from 'vitest';
import { ConfigBuilder, configSchema } from './config.js';

const build = (env: NodeJS.ProcessEnv) => new ConfigBuilder(configSchema).fromEnv(env).build();

describe('config', () => {
  it('exports ConfigBuilder', () => {
    expect(ConfigBuilder).toBeDefined();
  });

  it('defaults kafka and outbox settings', () => {
    const config = build({});
    expect(config.kafka).toEqual({
      brokers: ['localhost:9092'],
      clientId: 'scenario-manager',
      ssl: false,
      sasl: { mechanism: 'plain' },
      topics: { emulator: 'sm.emulator.commands', simulator: 'sm.simulator.commands' },
    });
    expect(config.outbox).toEqual({
      pollIntervalMs: 500,
      batchSize: 50,
      leaseMs: 60_000,
      backoffBaseMs: 1_000,
      backoffMaxMs: 60_000,
      maxAttempts: 0,
    });
    expect(config.eventSchemaVersion).toBe('1.1');
  });

  it('reads kafka and outbox settings from env', () => {
    const config = build({
      KAFKA_BROKERS: ' k1:9092, k2:9093 ,',
      KAFKA_CLIENT_ID: 'sm',
      KAFKA_SSL: 'true',
      KAFKA_SASL_MECHANISM: 'scram-sha-512',
      KAFKA_USERNAME: 'user',
      KAFKA_PASSWORD: 'secret',
      KAFKA_TOPIC_EMULATOR_COMMANDS: 'emu.cmd',
      KAFKA_TOPIC_SIMULATOR_COMMANDS: 'sim.cmd',
      OUTBOX_POLL_INTERVAL_MS: '250',
      OUTBOX_BATCH_SIZE: '10',
      OUTBOX_LEASE_MS: '30000',
      OUTBOX_BACKOFF_BASE_MS: '200',
      OUTBOX_BACKOFF_MAX_MS: '5000',
      OUTBOX_MAX_ATTEMPTS: '7',
      EVENT_SCHEMA_VERSION: '1.2',
    });
    expect(config.kafka.brokers).toEqual(['k1:9092', 'k2:9093']);
    expect(config.kafka.ssl).toBe(true);
    expect(config.kafka.sasl).toEqual({ mechanism: 'scram-sha-512', username: 'user', password: 'secret' });
    expect(config.kafka.topics).toEqual({ emulator: 'emu.cmd', simulator: 'sim.cmd' });
    expect(config.outbox).toEqual({
      pollIntervalMs: 250,
      batchSize: 10,
      leaseMs: 30_000,
      backoffBaseMs: 200,
      backoffMaxMs: 5000,
      maxAttempts: 7,
    });
    expect(config.eventSchemaVersion).toBe('1.2');
  });

  it('treats blank env vars as unset', () => {
    const config = build({ KAFKA_BROKERS: '', KAFKA_TOPIC_EMULATOR_COMMANDS: '', OUTBOX_BATCH_SIZE: '' });
    expect(config.kafka.brokers).toEqual(['localhost:9092']);
    expect(config.kafka.topics.emulator).toBe('sm.emulator.commands');
    expect(config.outbox.batchSize).toBe(50);
  });

  it.each([
    ['OUTBOX_BATCH_SIZE', '0'],
    ['OUTBOX_BATCH_SIZE', '501'],
    ['OUTBOX_LEASE_MS', '-1'],
    ['OUTBOX_MAX_ATTEMPTS', '-1'],
    ['KAFKA_SASL_MECHANISM', 'gssapi'],
    ['KAFKA_BROKERS', ' , '],
  ])('rejects %s=%s', (key, value) => {
    expect(() => build({ [key]: value })).toThrow(/Invalid configuration/);
  });
});
