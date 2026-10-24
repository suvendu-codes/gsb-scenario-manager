import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { before, after, test } from 'node:test';
import { eq } from 'drizzle-orm';
import type { PoolClient } from 'pg';
import { runDemoScenario } from '../../tools/local/demo-scenario.js';
import { runStatusValues } from '../../src/runs/domain/run-state.js';
import * as schema from '../../src/db/schema/index.js';
import { WorkerHarness } from './support/worker-harness.js';

const h = new WorkerHarness();
before(async () => { await h.start(); });
after(async () => { await h.close(); });
const terminal = ['completed', 'failed', 'interrupted', 'cancelled'] as const;

test('SW-01: complete failed-run/retry journey isolates historical events and acknowledges replay',
  { timeout: 150_000 }, runDemoScenario);

for (const status of runStatusValues) {
  test(`SW-02/${status}: persist status and update the selected scenario`, async () => {
    const f = await h.fixture();
    const event = h.status(f, status);
    await h.apply(event);
    const run = await h.run(f);
    assert.equal(run.status, status);
    assert.equal(run.engineRunId, f.engineId);
    assert.equal(run.statusEventAt?.toISOString(), event.emitted_at);
    assert.equal(run.completedAt !== null, terminal.some((value) => value === status));
    assert.equal((await h.scenario(f)).status,
      terminal.some((value) => value === status) ? 'finished' : status === 'paused' ? 'paused' : 'running');
  });
}

test('SW-03: pause and resume update both records', async () => {
  const f = await h.fixture();
  for (const status of ['running', 'paused', 'running'] as const) {
    await h.apply(h.status(f, status));
    assert.equal((await h.run(f)).status, status);
    assert.equal((await h.scenario(f)).status, status);
  }
});

test('SW-04: store failure details and setup URLs without losing fields', async () => {
  const f = await h.fixture();
  const engine_ref = { instance_url: 'https://engine.local/instance', live_socket: 'wss://engine.local/live' };
  await h.apply({ ...h.status(f, 'setup_ready'), event_type: 'run.status', status: 'setup_ready', engine_ref });
  await h.apply({ ...h.status(f, 'failed'), event_type: 'run.status', status: 'failed', reason: 'capacity', message: 'No engine capacity' });
  const run = await h.run(f);
  assert.deepEqual(JSON.parse(run.engineRef ?? '{}'), engine_ref);
  assert.equal(run.reason, 'capacity');
  assert.equal(run.statusMessage, 'No engine capacity');
});

for (const verdict of ['success', 'failure', 'inconclusive'] as const) {
  test(`SW-05/${verdict}: result completes an active execution and preserves opaque JSON`, async () => {
    const f = await h.fixture();
    const results = { nested: { values: [1, 'x', true, null, { metric: 7 }] }, empty: {}, list: [] };
    const event = h.result(f, verdict, h.now(), results);
    await h.apply(event);
    const run = await h.run(f);
    assert.equal(run.status, 'completed');
    assert.equal(run.verdict, verdict);
    assert.equal(run.completedAt?.toISOString(), event.emitted_at);
    assert.equal(run.resultEventAt?.toISOString(), event.emitted_at);
    assert.deepEqual(run.results, results);
    assert.equal((await h.scenario(f)).status, 'finished');
  });
}

for (const status of terminal) {
  test(`SW-06/${status}: terminal outcome and completion time survive later status events`, async () => {
    const f = await h.fixture();
    await h.apply(h.status(f, status));
    const saved = await h.run(f);
    await h.apply(h.status(f, 'running'));
    await h.apply(h.status(f, status === 'failed' ? 'completed' : 'failed'));
    assert.deepEqual(await h.run(f), saved);
    assert.equal((await h.scenario(f)).status, 'finished');
  });
  test(`SW-07/${status}: results enrich a terminal run without changing its outcome`, async () => {
    const f = await h.fixture();
    await h.apply(h.status(f, status));
    const saved = await h.run(f);
    const event = h.result(f, 'failure');
    await h.apply(event);
    const run = await h.run(f);
    assert.equal(run.status, status);
    assert.equal(run.completedAt?.getTime(), saved.completedAt?.getTime());
    assert.equal(run.verdict, 'failure');
    assert.equal(event.event_type, 'run.result');
    if (event.event_type === 'run.result') assert.deepEqual(run.results, event.results);
  });
}

for (const mode of ['duplicate', 'older', 'equal-time-conflict', 'stage-regression'] as const) {
  test(`SW-08/${mode}: ignored status is acknowledged without any row changes`, async () => {
    const f = await h.fixture();
    const event = h.status(f, 'running');
    await h.apply(event);
    const run = await h.run(f);
    const scenario = await h.scenario(f);
    const ignored = mode === 'duplicate' ? event :
      h.status(f, mode === 'stage-regression' ? 'provisioning' : 'paused',
        mode === 'older' ? new Date(Date.parse(event.emitted_at) - 1).toISOString() :
          mode === 'equal-time-conflict' ? event.emitted_at : h.now());
    await h.apply(ignored);
    assert.deepEqual(await h.run(f), run);
    assert.deepEqual(await h.scenario(f), scenario);
  });
}

for (const mode of ['duplicate', 'older', 'equal-time-conflict'] as const) {
  test(`SW-09/${mode}: ignored result is acknowledged without overwriting results`, async () => {
    const f = await h.fixture();
    const event = h.result(f);
    await h.apply(event);
    const saved = await h.run(f);
    await h.apply(mode === 'duplicate' ? event : h.result(f, 'failure',
      mode === 'older' ? new Date(Date.parse(event.emitted_at) - 1).toISOString() : event.emitted_at));
    assert.deepEqual(await h.run(f), saved);
  });
}

test('SW-10: a newer result replaces metrics/verdict but preserves completion time', async () => {
  const f = await h.fixture();
  await h.apply(h.result(f));
  const first = await h.run(f);
  await h.apply(h.result(f, 'inconclusive', h.now(), { replacement: true }));
  const run = await h.run(f);
  assert.deepEqual(run.results, { replacement: true });
  assert.equal(run.verdict, 'inconclusive');
  assert.equal(run.completedAt?.getTime(), first.completedAt?.getTime());
});

test('SW-11: an older result timestamp is independent of the latest status timestamp', async () => {
  const f = await h.fixture();
  const result = h.result(f);
  await h.apply(h.status(f, 'completed'));
  const completed = await h.run(f);
  await h.apply(result);
  const run = await h.run(f);
  assert.equal(run.verdict, 'success');
  assert.equal(run.resultEventAt?.toISOString(), result.emitted_at);
  assert.equal(run.completedAt?.getTime(), completed.completedAt?.getTime());
});

test('SW-12: result arriving before status remains terminal', async () => {
  const f = await h.fixture();
  await h.apply(h.result(f));
  const saved = await h.run(f);
  await h.apply(h.status(f, 'running'));
  assert.deepEqual(await h.run(f), saved);
});

test('SW-13: simulator executions use the same processing rules', async () => {
  const f = await h.fixture('simulator');
  await h.apply(h.status(f, 'running'));
  await h.apply(h.result(f));
  assert.equal((await h.run(f)).engine, 'simulator');
  assert.equal((await h.run(f)).status, 'completed');
});

test('SW-14: a run with no selected current pointer cannot update its scenario', async () => {
  const f = await h.fixture();
  await h.resources.pool.query("UPDATE scenario SET current_run_id=NULL,status='draft' WHERE id=$1", [f.scenarioId]);
  const saved = await h.scenario(f);
  await h.apply(h.result(f));
  assert.equal((await h.run(f)).status, 'completed');
  assert.deepEqual(await h.scenario(f), saved);
});

test('SW-15: interleaved events for different scenarios remain isolated', async () => {
  const a = await h.fixture();
  const b = await h.fixture();
  await Promise.all([h.apply(h.status(a, 'failed')), h.apply(h.status(b, 'paused'))]);
  assert.equal((await h.run(a)).status, 'failed');
  assert.equal((await h.run(b)).status, 'paused');
  assert.equal((await h.scenario(a)).status, 'finished');
  assert.equal((await h.scenario(b)).status, 'paused');
});

test('SW-16: separate status/result topics serialize simultaneous writes safely', async () => {
  const f = await h.fixture();
  const isolated = await h.isolated({ separateTopics: true });
  try {
    const status = h.status(f, 'running');
    const result = h.result(f);
    await Promise.all([h.acknowledged(await h.send(status, isolated.topics[0]), isolated.groupId),
      h.acknowledged(await h.send(result, isolated.topics[1]), isolated.groupId)]);
    const run = await h.run(f);
    assert.equal(run.status, 'completed');
    assert.equal(run.verdict, 'success');
    assert.equal((await h.scenario(f)).status, 'finished');
  } finally { await isolated.stop(); }
});

const invalidCases: Array<[string, (valid: ReturnType<WorkerHarness['status']>) => string | null]> = [
  ['malformed-json', () => '{'], ['null-body', () => null],
  ['unknown-type', (v) => JSON.stringify({ ...v, event_type: 'run.heartbeat' })],
  ['missing-correlation', (v) => JSON.stringify({ ...v, correlation_id: undefined })],
  ['invalid-status', (v) => JSON.stringify({ ...v, status: 'resuming' })],
  ['invalid-timestamp', (v) => JSON.stringify({ ...v, emitted_at: 'yesterday' })],
  ['unexpected-field', (v) => JSON.stringify({ ...v, sequence: 1 })],
  ['invalid-engine', (v) => JSON.stringify({ ...v, engine: 'other' })],
  ['invalid-url', (v) => JSON.stringify({ ...v, engine_ref: { instance_url: 'file:///tmp/x', live_socket: 'ws://engine.local' } })],
  ['invalid-result', (v) => JSON.stringify({ ...v, event_type: 'run.result', status: 'success', results: [] })],
];
for (const [name, body] of invalidCases) {
  test(`SW-17/${name}: reject invalid input without mutation or acknowledgement`, async () => {
    const f = await h.fixture();
    const saved = await h.run(f);
    const scenario = await h.scenario(f);
    const isolated = await h.isolated();
    try {
      const sent = await isolated.send(body(h.status(f, 'running')));
      await isolated.waitForFailure();
      await isolated.assertUnacknowledged(sent);
      assert.deepEqual(await h.run(f), saved);
      assert.deepEqual(await h.scenario(f), scenario);
    } finally { await isolated.stop(); }
  });
}

for (const mismatch of ['engine', 'engine-run-id'] as const) {
  test(`SW-18/${mismatch}: reject a response for a different engine identity`, async () => {
    const f = await h.fixture();
    await h.apply(h.status(f, 'running'));
    const saved = await h.run(f);
    const isolated = await h.isolated();
    try {
      const valid = h.status(f, 'paused');
      const event = mismatch === 'engine' ? { ...valid, engine: 'simulator' } : { ...valid, run_id: randomUUID() };
      const sent = await isolated.send(JSON.stringify(event));
      await isolated.waitForFailure();
      await isolated.assertUnacknowledged(sent);
      assert.deepEqual(await h.run(f), saved);
    } finally { await isolated.stop(); }
  });
}

test('SW-19: unknown correlation is retained and replays after the run is registered', async () => {
  const f = await h.fixture();
  const futureCorrelation = randomUUID();
  const event = { ...h.status(f, 'running'), correlation_id: futureCorrelation };
  let isolated = await h.isolated();
  try {
    const sent = await isolated.send(JSON.stringify(event));
    await isolated.waitForFailure();
    await isolated.assertUnacknowledged(sent);
    const found = await h.db.select().from(schema.run).where(eq(schema.run.correlationId, futureCorrelation));
    assert.equal(found.length, 0, 'Events cannot create runs');
    assert.equal((await h.run(f)).engineRunId, null);
    await isolated.stop();
    await h.resources.pool.query('UPDATE run SET correlation_id=$1 WHERE id=$2', [futureCorrelation, f.id]);
    isolated = await h.isolated({ groupId: isolated.groupId, topics: isolated.topics });
    await h.acknowledged(sent, isolated.groupId);
    assert.equal((await h.run(f)).status, 'running');
  } finally { await isolated.stop(); }
});

test('SW-20: offset commit failure preserves data and replay is an acknowledged no-op', async () => {
  const f = await h.fixture();
  let isolated = await h.isolated({ failFirstCommit: true });
  try {
    const event = h.result(f);
    const sent = await isolated.send(JSON.stringify(event));
    await isolated.waitForFailure();
    await isolated.assertUnacknowledged(sent);
    const saved = await h.run(f);
    assert.equal(saved.status, 'completed');
    assert.equal(saved.verdict, 'success');
    await isolated.stop();
    isolated = await h.isolated({ groupId: isolated.groupId, topics: isolated.topics });
    await h.acknowledged(sent, isolated.groupId);
    assert.deepEqual(await h.run(f), saved);
  } finally { await isolated.stop(); }
});

test('SW-21: scenario-write failure rolls back the run update and retries after repair', async () => {
  const f = await h.fixture();
  const saved = await h.run(f);
  const scenario = await h.scenario(f);
  const constraint = `module_reject_${randomUUID().replaceAll('-', '')}`;
  await h.resources.pool.query(`ALTER TABLE scenario ADD CONSTRAINT "${constraint}"
    CHECK (id <> '${f.scenarioId}'::uuid OR status <> 'paused')`);
  let isolated = await h.isolated();
  try {
    const sent = await isolated.send(JSON.stringify(h.status(f, 'paused')));
    await isolated.waitForFailure();
    await isolated.assertUnacknowledged(sent);
    assert.deepEqual(await h.run(f), saved);
    assert.deepEqual(await h.scenario(f), scenario);
    await isolated.stop();
    await h.resources.pool.query(`ALTER TABLE scenario DROP CONSTRAINT "${constraint}"`);
    isolated = await h.isolated({ groupId: isolated.groupId, topics: isolated.topics });
    await h.acknowledged(sent, isolated.groupId);
    assert.equal((await h.run(f)).status, 'paused');
    assert.equal((await h.scenario(f)).status, 'paused');
  } finally {
    await isolated.stop();
    await h.resources.pool.query(`ALTER TABLE scenario DROP CONSTRAINT IF EXISTS "${constraint}"`);
  }
});

test('SW-22: consumer restart resumes committed offsets without rewriting old events', async () => {
  const f = await h.fixture();
  let isolated = await h.isolated();
  try {
    await h.acknowledged(await isolated.send(JSON.stringify(h.status(f, 'running'))), isolated.groupId);
    await isolated.stop();
    isolated = await h.isolated({ groupId: isolated.groupId, topics: isolated.topics });
    const sent = await isolated.send(JSON.stringify(h.status(f, 'paused')));
    await h.acknowledged(sent, isolated.groupId);
    assert.deepEqual(isolated.deliveries.map((delivery) => delivery.offset), sent.map((m) => m.baseOffset),
      'Restarted consumer must receive only the new offset, not the acknowledged event');
    assert.equal((await h.run(f)).status, 'paused');
    assert.equal((await h.scenario(f)).status, 'paused');
  } finally { await isolated.stop(); }
});

async function withRun(check: (client: PoolClient, scenarioId: string, runId: string) => Promise<void>) {
  const client = await h.resources.pool.connect();
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
    try { await client.query('ROLLBACK'); }
    finally { client.release(); }
  }
}

for (const status of runStatusValues.filter((s) => !terminal.some((t) => t === s))) {
  test(`SW-23/${status}: database forbids a second active run`, async () => {
    await withRun(async (client, scenarioId, id) => {
      await client.query('UPDATE run SET status=$1 WHERE id=$2', [status, id]);
      const next = randomUUID();
      await assert.rejects(client.query(`INSERT INTO run (id,correlation_id,scenario_id,engine)
        VALUES ($1::uuid,$1::text,$2,'emulator')`, [next, scenarioId]), { code: '23505' });
    });
  });
}
for (const status of terminal) {
  test(`SW-24/${status}: database allows a new linked run after termination`, async () => {
    await withRun(async (client, scenarioId, id) => {
      await client.query('UPDATE run SET status=$1 WHERE id=$2', [status, id]);
      const next = randomUUID();
      await client.query(`INSERT INTO run (id,correlation_id,scenario_id,engine,retry_of_run_id)
        VALUES ($1::uuid,$1::text,$2,'emulator',$3)`, [next, scenarioId, id]);
      const row = await client.query<{ retry_of_run_id: string }>('SELECT retry_of_run_id FROM run WHERE id=$1', [next]);
      assert.equal(row.rows[0].retry_of_run_id, id);
    });
  });
}
for (const reference of ['current-run', 'retry-parent'] as const) {
  test(`SW-25/${reference}: database rejects a reference to another scenario's run`, async () => {
    await withRun(async (client, _scenarioId, id) => {
      const other = randomUUID();
      await client.query(`INSERT INTO scenario (id,name,project_id,map_id,author_id)
        VALUES ($1::uuid,$1::text,'module-test',$1::text,'module-test')`, [other]);
      if (reference === 'current-run') {
        await assert.rejects(client.query('UPDATE scenario SET current_run_id=$1 WHERE id=$2', [id, other]), { code: '23503' });
      } else {
        const next = randomUUID();
        await assert.rejects(client.query(`INSERT INTO run (id,correlation_id,scenario_id,engine,retry_of_run_id)
          VALUES ($1::uuid,$1::text,$2,'emulator',$3)`, [next, other, id]), { code: '23503' });
      }
    });
  });
}

test('SW-26: database rejects a run that retries itself', async () => {
  await withRun(async (client, _scenarioId, id) => {
    await assert.rejects(client.query('UPDATE run SET retry_of_run_id=id WHERE id=$1', [id]), { code: '23514' });
  });
});

test('SW-27: database rejects duplicate correlation IDs across scenarios', async () => {
  await withRun(async (client, _scenarioId, id) => {
    const other = randomUUID();
    await client.query(`INSERT INTO scenario (id,name,project_id,map_id,author_id)
      VALUES ($1::uuid,$1::text,'module-test',$1::text,'module-test')`, [other]);
    await assert.rejects(client.query(`INSERT INTO run (id,correlation_id,scenario_id,engine)
      VALUES ($1,$2,$3,'emulator')`, [randomUUID(), id, other]), { code: '23505' });
  });
});

test('SW-28: a rejected record prevents a later same-partition event from being acknowledged', async () => {
  const f = await h.fixture();
  const saved = await h.run(f);
  const isolated = await h.isolated();
  try {
    const bad = await isolated.send('{');
    const next = await isolated.send(JSON.stringify(h.status(f, 'running')));
    await isolated.waitForFailure();
    await isolated.assertUnacknowledged(bad);
    await isolated.assertUnacknowledged(next);
    assert.deepEqual(await h.run(f), saved);
  } finally { await isolated.stop(); }
});
