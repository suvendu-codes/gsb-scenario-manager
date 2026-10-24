import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { localResources } from './local-resources.js';

async function main() {
  const { pool, kafka, config } = localResources();
  const admin = kafka.admin();
  try {
    await migrate(drizzle(pool), { migrationsFolder: './drizzle' });
    console.info(JSON.stringify({ event: 'local_migrations_complete' }));
    await admin.connect();
    const topics = [...new Set([config.statusTopic, config.resultTopic])];
    const existing = new Set(await admin.listTopics());
    const missing = topics.filter((topic) => !existing.has(topic));
    if (missing.length) {
      await admin.createTopics({
        waitForLeaders: true,
        topics: missing.map((topic) => ({ topic, numPartitions: 3, replicationFactor: 1 })),
      });
    }
    console.info(JSON.stringify({ event: 'local_topics_ready', topics }));
  } finally {
    try { await admin.disconnect(); }
    finally { await pool.end(); }
  }
}

main().catch((error: unknown) => {
  console.error('Local initialization failed:', error instanceof Error ? error.message : 'unknown error');
  process.exitCode = 1;
});
