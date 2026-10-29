import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { z } from 'zod';
import type { RecordMetadata } from 'kafkajs';
import type { RunEvent } from '../../src/status-worker/domain/run-event.js';
import { runEventSchema } from '../../src/status-worker/domain/run-event.js';
import { demoResult, demoStatus } from './demo-events.js';
import { localResources } from './local-resources.js';

type SavedRun = { run_id: string | null; id: string; status: string; results: Record<string, unknown>; correlation_id: string };

export async function runDemoScenario() {
  const eventDelay = z.coerce.number().int().min(0).max(10_000).parse(process.env.DEMO_EVENT_DELAY_MS ?? 500);
  const { pool, kafka, config } = localResources();
  const producer = kafka.producer({ allowAutoTopicCreation: false });
  const admin = kafka.admin();
  const scenarioId = randomUUID();
  const firstId = randomUUID();
  const secondId = randomUUID();
  const firstCid = `local-${firstId}`;
  const secondCid = `local-${secondId}`;
  const firstEngineId = `emu-${firstId}`;
  const secondEngineId = `emu-${secondId}`;
  let clock = Date.now();
  const timestamp = () => new Date(++clock).toISOString();

  async function publish(event: RunEvent) {
    runEventSchema.parse(event);
    const topic = event.event_type === 'run.status' ? config.statusTopic : config.resultTopic;
    const offsets = await producer.send({ topic, acks: -1, messages: [{
      key: event.correlation_id, value: JSON.stringify(event),
    }] });
    console.info(JSON.stringify({ event: 'demo_published', eventType: event.event_type,
      status: event.event_type === 'run.status' ? event.status : undefined, correlationId: event.correlation_id, offsets }));
    await delay(eventDelay);
    return offsets;
  }

  async function waitForOffsets(sent: RecordMetadata[]) {
    const deadline = Date.now() + 45_000;
    while (Date.now() < deadline) {
      const offsets = await admin.fetchOffsets({ groupId: config.groupId, topics: [...new Set(sent.map((m) => m.topicName))] });
      const acknowledged = sent.every((m) => {
        const committed = offsets.find((t) => t.topic === m.topicName)?.partitions.find((p) => p.partition === m.partition)?.offset;
        return committed !== undefined && m.baseOffset !== undefined && BigInt(committed) > BigInt(m.baseOffset);
      });
      if (acknowledged) {
        console.info(JSON.stringify({ event: 'demo_offset_commits_verified', offsets }));
        return;
      }
      await delay(250);
    }
    throw new Error('Worker did not acknowledge the final duplicate event');
  }

  async function waitForRun(id: string, matches: (run: SavedRun) => boolean) {
    const deadline = Date.now() + 45_000;
    while (Date.now() < deadline) {
      const { rows } = await pool.query<SavedRun>('SELECT id, run_id, status, results, correlation_id FROM run WHERE id=$1', [id]);
      const saved = rows[0];
      if (saved?.run_id && matches(saved)) {
        console.info(JSON.stringify({ event: 'demo_database_verified', runId: id, status: saved.status }));
        return saved;
      }
      await delay(250);
    }
    throw new Error(`Timed out waiting for worker to persist run ${id}; inspect worker logs`);
  }

  try {
    await producer.connect();
    await admin.connect();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`INSERT INTO scenario (id,name,project_id,map_id,author_id,status)
        VALUES ($1,$2,'local-demo',$3,'local-generator','running')`, [scenarioId, `Local demo ${scenarioId}`, `map-${scenarioId}`]);
      await client.query(`INSERT INTO run (id,correlation_id,scenario_id,engine) VALUES ($1,$2,$3,'emulator')`, [firstId, firstCid, scenarioId]);
      await client.query('UPDATE scenario SET current_run_id=$1 WHERE id=$2', [firstId, scenarioId]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
    console.info(JSON.stringify({ event: 'demo_seeded', scenarioId, runId: firstId, correlationId: firstCid }));
    for (const status of ['accepted', 'setup_ready', 'running', 'failed'] as const) {
      await publish(demoStatus(firstCid, firstEngineId, status, timestamp()));
      // Require the worker-bound engine ID so the initial accepted DB default cannot pass.
      await waitForRun(firstId, (r) => r.status === status);
    }

    const retry = await pool.connect();
    try {
      await retry.query('BEGIN');
      await retry.query('SELECT id FROM scenario WHERE id=$1 FOR UPDATE', [scenarioId]);
      const previous = await retry.query<{ status: string }>('SELECT status FROM run WHERE id=$1 FOR UPDATE', [firstId]);
      if (previous.rows[0]?.status !== 'failed') throw new Error('Previous run must be failed before retry');
      await retry.query(`INSERT INTO run (id,correlation_id,scenario_id,engine,retry_of_run_id)
        VALUES ($1,$2,$3,'emulator',$4)`, [secondId, secondCid, scenarioId, firstId]);
      await retry.query(`UPDATE scenario SET current_run_id=$1,status='running',updated_at=now() WHERE id=$2`, [secondId, scenarioId]);
      await retry.query('COMMIT');
    } catch (error) {
      await retry.query('ROLLBACK');
      throw error;
    } finally { retry.release(); }
    console.info(JSON.stringify({ event: 'demo_retry_created', scenarioId, runId: secondId, correlationId: secondCid }));

    await publish(demoResult(firstCid, firstEngineId, timestamp(), 'late-old-result'));
    await waitForRun(firstId, (r) => r.results.demo_marker === 'late-old-result');
    const unchanged = await pool.query<{ current_run_id: string; status: string }>('SELECT current_run_id,status FROM scenario WHERE id=$1', [scenarioId]);
    if (unchanged.rows[0]?.current_run_id !== secondId || unchanged.rows[0]?.status !== 'running') {
      throw new Error('Late historical event corrupted current scenario');
    }
    console.info(JSON.stringify({ event: 'demo_old_run_isolation_verified', scenarioId }));

    for (const status of ['accepted', 'setup_ready', 'running', 'paused', 'running'] as const) {
      await publish(demoStatus(secondCid, secondEngineId, status, timestamp()));
      await waitForRun(secondId, (r) => r.status === status);
    }
    await publish(demoStatus(secondCid, secondEngineId, 'completed', timestamp()));
    const result = demoResult(secondCid, secondEngineId, timestamp(), 'current-success');
    await publish(result);
    await waitForRun(secondId, (r) => r.status === 'completed' && r.results.demo_marker === 'current-success');
    const replayOffsets = await publish(result); // Exact redelivery must be acknowledged.
    await waitForOffsets(replayOffsets);
    const rows = await pool.query('SELECT id, correlation_id, run_id, status, verdict, retry_of_run_id, results FROM run WHERE scenario_id=$1 ORDER BY created_at,id', [scenarioId]);
    const owner = await pool.query<{ current_run_id: string; status: string }>('SELECT current_run_id,status FROM scenario WHERE id=$1', [scenarioId]);
    if (owner.rows[0]?.current_run_id !== secondId || owner.rows[0]?.status !== 'finished') throw new Error('Final scenario state is incorrect');
    console.info(JSON.stringify({ event: 'demo_passed', scenarioId, scenario: owner.rows[0], runs: rows.rows }, null, 2));
  } finally {
    try { await producer.disconnect(); }
    finally {
      try { await admin.disconnect(); }
      finally { await pool.end(); }
    }
  }
}
