import { Kafka, logLevel } from 'kafkajs';
import { Pool } from 'pg';
import { appConfig } from '../../src/config.js';
import { readKafkaConfig } from '../../src/status-worker/infrastructure/kafka.config.js';

/** Explicit opt-in: never seed or initialize a production deployment. */
export function assertLocalDemo(env: NodeJS.ProcessEnv = process.env) {
  if (env.NODE_ENV === 'production' || env.LOCAL_DEMO_ENABLED !== 'true') {
    throw new Error('Local tools require LOCAL_DEMO_ENABLED=true and a non-production environment');
  }
}

export function localResources() {
  assertLocalDemo();
  const config = readKafkaConfig();
  if (!config.brokers.length) throw new Error('Local tools require KAFKA_BROKERS');
  const pool = new Pool({
    connectionString: appConfig.db.url, max: 2,
    connectionTimeoutMillis: 10_000, statement_timeout: 10_000,
    idleTimeoutMillis: 10_000,
  });
  pool.on('error', () => console.error('Local database connection error'));
  const kafka = new Kafka({
    clientId: 'scenario-local-tools', brokers: config.brokers,
    ssl: config.ssl,
    ...(config.username && config.password ? {
      sasl: { mechanism: 'plain', username: config.username, password: config.password },
    } : {}),
    connectionTimeout: 10_000, requestTimeout: 30_000, logLevel: logLevel.ERROR,
  });
  return { pool, kafka, config };
}
