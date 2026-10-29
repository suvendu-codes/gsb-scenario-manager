import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Kafka, logLevel, type Consumer, type KafkaMessage } from 'kafkajs';
import { Client, Pool } from 'pg';
import type { DrizzleDB } from '../../../src/db/db.module.js';
import * as schema from '../../../src/db/schema/index.js';

export const infraEnv = {
  databaseUrl: process.env.MODULE_TEST_DATABASE_URL,
  kafkaBrokers: process.env.MODULE_TEST_KAFKA_BROKERS?.split(',').map((b) => b.trim()).filter(Boolean),
};
export const hasInfra = Boolean(infraEnv.databaseUrl && infraEnv.kafkaBrokers?.length);

const MIGRATIONS = fileURLToPath(new URL('../../../drizzle', import.meta.url));
const SCHEMA_SQL = fileURLToPath(new URL('../../../db/schema.sql', import.meta.url));

const withDatabase = (url: string, name: string) => {
  const u = new URL(url);
  u.pathname = `/${name}`;
  return u.toString();
};

/** A throwaway database on the configured server; dropped by `drop()`. */
export async function createTestDatabase(init: 'migrations' | 'schema.sql') {
  const name = `sm_outbox_mt_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
  const admin = new Client({ connectionString: infraEnv.databaseUrl });
  await admin.connect();
  await admin.query(`CREATE DATABASE ${name}`);
  await admin.end();

  const url = withDatabase(infraEnv.databaseUrl!, name);
  const pool = new Pool({ connectionString: url, max: 10 });
  const db: DrizzleDB = drizzle(pool, { schema });
  if (init === 'migrations') {
    await migrate(db, { migrationsFolder: MIGRATIONS });
  } else {
    await pool.query(await readFile(SCHEMA_SQL, 'utf8'));
  }

  return {
    name,
    url,
    pool,
    db,
    async drop() {
      await pool.end();
      const c = new Client({ connectionString: infraEnv.databaseUrl });
      await c.connect();
      await c.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
      await c.end();
    },
  };
}
export type TestDatabase = Awaited<ReturnType<typeof createTestDatabase>>;

export function testKafka() {
  return new Kafka({ clientId: 'sm-outbox-module-test', brokers: infraEnv.kafkaBrokers!, logLevel: logLevel.NOTHING });
}

export async function createTopics(topics: string[]) {
  const admin = testKafka().admin();
  await admin.connect();
  await admin.createTopics({ waitForLeaders: true, topics: topics.map((topic) => ({ topic, numPartitions: 3 })) });
  await admin.disconnect();
}

export interface Received {
  topic: string;
  partition: number;
  key: string | null;
  value: Record<string, unknown>;
  headers: Record<string, string>;
}

/** Subscribes from the beginning and collects every record on `topics`. */
export async function collect(topics: string[]): Promise<{ messages: Received[]; stop: () => Promise<void> }> {
  const consumer: Consumer = testKafka().consumer({ groupId: `mt-${randomUUID()}` });
  const messages: Received[] = [];
  await consumer.connect();
  await consumer.subscribe({ topics, fromBeginning: true });
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      messages.push(toReceived(topic, partition, message));
    },
  });
  return { messages, stop: () => consumer.disconnect() };
}

const toReceived = (topic: string, partition: number, message: KafkaMessage): Received => ({
  topic,
  partition,
  key: message.key?.toString() ?? null,
  value: JSON.parse(message.value?.toString() ?? 'null'),
  headers: Object.fromEntries(
    Object.entries(message.headers ?? {}).map(([k, v]) => [k, Array.isArray(v) ? String(v[0]) : String(v)]),
  ),
});

export async function seedScenario(
  pool: Pool,
  overrides: Partial<{ id: string; status: string; outboundUri: string | null; mapId: string; name: string }> = {},
) {
  const id = overrides.id ?? randomUUID();
  await pool.query(
    `INSERT INTO scenario (id, name, project_id, map_id, status, outbound_uri, author_id)
     VALUES ($1, $2, $3, $4, $5, $6, 'module-test')`,
    [
      id,
      overrides.name ?? `scenario-${id}`,
      '69bed8af82b48a28a231db1b',
      overrides.mapId ?? randomUUID(),
      overrides.status ?? 'draft',
      overrides.outboundUri ?? null,
    ],
  );
  return id;
}
