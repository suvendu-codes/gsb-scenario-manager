import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import type { PoolClient } from 'pg';
import { runDemoScenario } from './demo-scenario.js';
import { localResources } from './local-resources.js';

// Explicitly invoked in Docker; intentionally separate from the fast Vitest unit suite.
test('Kafka consumption persists lifecycle/results, isolates retries, and acknowledges replay',
  { timeout: 150_000 }, runDemoScenario);

async function withRun(check: (client: PoolClient, scenarioId: string, runId: string) => Promise<void>) {
  const { pool } = localResources();
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const scenarioId = randomUUID();
      const runId = randomUUID();
      await client.query(`INSERT INTO scenario (id,name,project_id,map_id,author_id)
        VALUES ($1::uuid,$1::text,'module-test',$1::text,'module-test')`, [scenarioId]);
      await client.query(`INSERT INTO run (id,correlation_id,scenario_id,engine)
        VALUES ($1::uuid,$1::text,$2,'emulator')`, [runId, scenarioId]);
      await check(client, scenarioId, runId);
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
  } finally { await pool.end(); }
}

for (const status of ['running', 'paused']) {
  test(`PostgreSQL prevents a second active execution while the first is ${status}`, { timeout: 15_000 }, async () => {
    await withRun(async (client, scenarioId, runId) => {
      await client.query('UPDATE run SET status=$1 WHERE id=$2', [status, runId]);
      const anotherId = randomUUID();
      await assert.rejects(client.query(`INSERT INTO run (id,correlation_id,scenario_id,engine)
        VALUES ($1::uuid,$1::text,$2,'emulator')`, [anotherId, scenarioId]), { code: '23505' });
    });
  });
}

test('PostgreSQL rejects a current-run pointer belonging to another scenario', { timeout: 15_000 }, async () => {
  await withRun(async (client, _scenarioId, runId) => {
    const anotherScenario = randomUUID();
    await client.query(`INSERT INTO scenario (id,name,project_id,map_id,author_id)
      VALUES ($1::uuid,$1::text,'module-test',$1::text,'module-test')`, [anotherScenario]);
    await assert.rejects(client.query('UPDATE scenario SET current_run_id=$1 WHERE id=$2',
      [runId, anotherScenario]), { code: '23503' });
  });
});
