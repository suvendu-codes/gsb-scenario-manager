import { readFile } from 'node:fs/promises';
import { localResources } from './local-resources.js';

async function main() {
  const { pool, kafka, config } = localResources();
  const admin = kafka.admin();
  try {
    // The same non-destructive baseline is used by local demo and isolated CI.
    // Keep one connection for the complete SQL transaction, including failure cleanup.
    const schemaSql = await readFile('db/schema.sql', 'utf8');
    const client = await pool.connect();
    try { await client.query(schemaSql); }
    catch (error) {
      try { await client.query('ROLLBACK'); } catch { /* Preserve the initialization failure. */ }
      throw error;
    } finally { client.release(); }
    console.info(JSON.stringify({ event: 'local_schema_ready' }));
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
