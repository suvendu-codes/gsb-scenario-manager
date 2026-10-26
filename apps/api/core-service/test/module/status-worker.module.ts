import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';
import kafkaJs from 'kafkajs';
import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { WorkerHarness, eventually, type Fixture } from './support/worker-harness.js';
import type { RunEvent } from '../../src/status-worker/domain/run-event.js';
import type { RunEventRejectionCode } from '../../src/status-worker/domain/run-event-rejection.js';
const h = new WorkerHarness();
before(() => h.start()); after(() => h.close());

const { KafkaJSProtocolError } = kafkaJs;

for (const engine of ['emulator', 'simulator'] as const) {
  for (const final of ['completed', 'failed'] as const) {
    test(`SW-01/${engine}/${final}: terminal status then mandatory opaque results`, async () => {
      const f = await h.fixture(engine);
      await h.apply(h.status(f, 'accepted', 1));
      await h.apply(h.status(f, 'running', 2));
      await h.apply(h.status(f, final, 3));
      assert.equal((await h.run(f)).resultEventAt, null);
      const e = h.result(f, 4, { custom: { arbitrary: [1, true, null] } });
      await h.apply(e); const saved = await h.run(f);
      assert.equal(saved.status, final); assert.deepEqual(saved.results, e.results);
      assert.equal(saved.lastEventSequence, 4); assert.equal((await h.scenario(f)).status, 'finished');
      await h.apply(e); assert.deepEqual(await h.run(f), saved);
    });
  }
}
test('SW-02: gap is committed durably; another run progresses; restart and repair drain held events', async () => {
  const f = await h.fixture(); const other = await h.fixture();
  let worker = await h.isolated();
  try {
    const held = h.status(f, 'paused', 3);
    await h.acknowledged(await worker.send(JSON.stringify(held)), worker.groupId);
    assert.equal((await h.run(f)).status, 'trigger_requested');
    assert.equal((await h.run(f)).recoveryRequired, true);
    await h.acknowledged(await worker.send(JSON.stringify(h.status(other, 'accepted', 1))), worker.groupId);
    assert.equal((await h.run(other)).status, 'accepted');
    await worker.stop(); worker = await h.isolated({ groupId: worker.groupId, topics: worker.topics });
    await h.acknowledged(await worker.send(JSON.stringify(h.status(f, 'accepted', 1))), worker.groupId);
    await h.acknowledged(await worker.send(JSON.stringify(h.status(f, 'running', 2))), worker.groupId);
    assert.equal((await h.run(f)).status, 'paused');
    assert.equal((await h.run(f)).lastEventSequence, 3);
    assert.equal((await h.run(f)).recoveryRequired, false);
  } finally { await worker.stop(); }
});
for (const command of ['pause', 'resume', 'cancel'] as const) {
  test(`SW-03/${command}: acceptance stays pending, destination clears it`, async () => {
    const f = await h.fixture(); await h.apply(h.status(f, 'accepted', 1));
    await h.apply(h.status(f, 'running', 2));
    if (command === 'resume') await h.apply(h.status(f, 'paused', 3));
    const sequence = command === 'resume' ? 4 : 3;
    await h.resources.pool.query('UPDATE run SET pending_command=$1,command_sequence=7 WHERE id=$2', [command, f.id]);
    const current = command === 'resume' ? 'paused' : 'running';
    await h.apply(h.status(f, current, sequence, { command_id: command, command_sequence: 7, decision: 'accepted' }));
    assert.equal((await h.run(f)).pendingCommand, command);
    const destination = command === 'pause' ? 'paused' : command === 'resume' ? 'running' : 'cancelled';
    await h.apply(h.status(f, destination, sequence + 1, { command_id: command, command_sequence: 7, decision: 'accepted' }));
    assert.equal((await h.run(f)).pendingCommand, null);
    assert.equal((await h.run(f)).status, destination);
  });
}
test('SW-04: Run rejection without run_id fails and accepts subsequent result', async () => {
  const f = await h.fixture();
  await h.resources.pool.query("UPDATE run SET pending_command='run',command_sequence=1 WHERE id=$1", [f.id]);
  await h.apply(h.status(f, 'failed', 1, { run_id: undefined, command_id: 'run', command_sequence: 1, decision: 'rejected', reason: 'config_invalid' }));
  assert.equal((await h.run(f)).engineRunId, null); assert.equal((await h.run(f)).pendingCommand, null);
  const result = { ...h.result(f), run_id: undefined };
  await h.apply(result);
  const saved = await h.run(f);
  assert.equal(saved.status, 'failed'); assert.equal(saved.engineRunId, null);
  assert.deepEqual(saved.results, result.results);
  assert.equal(saved.resultEventAt?.toISOString(), result.emitted_at);
  assert.equal(saved.lastEventSequence, 2);
});
for (const final of ['completed', 'failed', 'cancelled'] as const) {
  test(`SW-05/${final}: terminal outcome clears pending action and permits a distinct execution`, async () => {
    const f = await h.fixture();
    await h.resources.pool.query("UPDATE run SET pending_command='pause',command_sequence=3 WHERE id=$1", [f.id]);
    await h.apply(h.status(f, final, 1));
    assert.equal((await h.run(f)).pendingCommand, null);
    const id = randomUUID();
    await h.resources.pool.query("INSERT INTO run(id,correlation_id,scenario_id,engine,retry_of_run_id) VALUES($1,$2,$3,'emulator',$4)", [id, randomUUID(), f.scenarioId, f.id]);
  });
}
test('SW-06: rejected pause preserves state and records reason', async () => {
  const f = await h.fixture(); await h.apply(h.status(f, 'accepted')); await h.apply(h.status(f, 'running', 2));
  await h.resources.pool.query("UPDATE run SET pending_command='pause',command_sequence=3 WHERE id=$1", [f.id]);
  await h.apply(h.status(f, 'running', 3, { command_id: 'pause', command_sequence: 3, decision: 'rejected', reason: 'busy' }));
  const r = await h.run(f); assert.equal(r.status, 'running'); assert.equal(r.commandReason, 'busy'); assert.equal(r.pendingCommand, null);
});
test('SW-07: heartbeat does not change state or command and replay cannot refresh freshness', async () => {
  const f = await h.fixture();
  await h.resources.pool.query("UPDATE run SET pending_command='pause',command_sequence=3 WHERE id=$1", [f.id]);
  const event = { event_type: 'run.heartbeat', correlation_id: f.correlationId, engine: f.engine, emitted_at: h.now(), progress: { n: 1 } };
  await h.acknowledged(await h.send(event)); const before = await h.run(f);
  await h.acknowledged(await h.send(event)); assert.deepEqual(await h.run(f), before);
  assert.equal(before.status, 'trigger_requested'); assert.equal(before.lastEventSequence, 0);
  assert.equal(before.pendingCommand, 'pause'); assert.equal(before.commandSequence, 3);
  assert.deepEqual(before.progress, event.progress);
  assert.equal(before.heartbeatEmittedAt?.toISOString(), event.emitted_at);
  assert.ok(before.heartbeatReceivedAt);
});
test('SW-08: commit failure preserves state and restart replays idempotently', async () => {
  const f = await h.fixture(); let worker = await h.isolated({ failFirstCommit: true });
  try {
    const sent = await worker.send(JSON.stringify(h.status(f, 'accepted')));
    await worker.waitForFailure(); await worker.assertUnacknowledged(sent); const saved = await h.run(f);
    await worker.stop(); worker = await h.isolated({ groupId: worker.groupId, topics: worker.topics });
    await h.acknowledged(sent, worker.groupId); assert.deepEqual(await h.run(f), saved);
  } finally { await worker.stop(); }
});
for (const [name, patch] of [
  ['correlation missing', { correlation_id: undefined }], ['engine conflict', { engine: 'simulator' }],
  ['invalid sequence', { sequence: 0 }], ['invalid lifecycle status', { status: 'success' }],
] as const) {
  test(`SW-09/${name}: reject without persistence or offset commit`, async () => {
    const f = await h.fixture(); const before = await h.run(f); const worker = await h.isolated();
    try {
      const sent = await worker.send(JSON.stringify({ ...h.status(f, 'accepted'), ...patch }));
      await worker.waitForFailure(); await worker.assertUnacknowledged(sent); assert.deepEqual(await h.run(f), before);
    } finally { await worker.stop(); }
  });
}
test('SW-10: a changed payload under an applied sequence is rejected', async () => {
  const f = await h.fixture(); const event = h.status(f, 'accepted'); await h.apply(event);
  const worker = await h.isolated();
  try {
    const sent = await worker.send(JSON.stringify({ ...event, status: 'running' }));
    await worker.waitForFailure(); await worker.assertUnacknowledged(sent); assert.equal((await h.run(f)).status, 'accepted');
  } finally { await worker.stop(); }
});
test('SW-11: active executions prevent overlapping Run', async () => {
  const f = await h.fixture();
  await assert.rejects(h.resources.pool.query("INSERT INTO run(correlation_id,scenario_id,engine) VALUES($1,$2,'emulator')", [randomUUID(), f.scenarioId]), { code: '23505' });
});
test('SW-12: historical result leaves current scenario untouched', async () => {
  const f = await h.fixture(); await h.apply(h.status(f, 'failed'));
  const next = randomUUID();
  await h.resources.pool.query("INSERT INTO run(id,correlation_id,scenario_id,engine) VALUES($1,$2,$3,'emulator')", [next, randomUUID(), f.scenarioId]);
  await h.resources.pool.query("UPDATE scenario SET current_run_id=$1,status='running' WHERE id=$2", [next, f.scenarioId]);
  await h.apply(h.result(f)); assert.equal((await h.scenario(f)).status, 'running'); assert.equal((await h.scenario(f)).currentRunId, next);
});
test('SW-13: database scenario failure rolls back receipt and run; restart retries after repair', async () => {
  const f = await h.fixture(); const constraint = 'reject_' + randomUUID().replaceAll('-', '');
  await h.resources.pool.query(`ALTER TABLE scenario ADD CONSTRAINT "${constraint}" CHECK (id <> '${f.scenarioId}'::uuid OR status <> 'finished')`);
  let worker = await h.isolated();
  try {
    const event = h.status(f, 'completed'); const sent = await worker.send(JSON.stringify(event));
    await worker.waitForFailure(); await worker.assertUnacknowledged(sent);
    assert.equal((await h.run(f)).lastEventSequence, 0);
    const receipts = await h.resources.pool.query('SELECT * FROM run_event_inbox WHERE run_id=$1', [f.id]); assert.equal(receipts.rowCount, 0);
    await worker.stop(); await h.resources.pool.query(`ALTER TABLE scenario DROP CONSTRAINT "${constraint}"`);
    worker = await h.isolated({ groupId: worker.groupId, topics: worker.topics }); await h.acknowledged(sent, worker.groupId);
    assert.equal((await h.run(f)).status, 'completed');
  } finally { await worker.stop(); await h.resources.pool.query(`ALTER TABLE scenario DROP CONSTRAINT IF EXISTS "${constraint}"`); }
});

test('SW-14: an old command response cannot resolve a newer request', async () => {
  const f = await h.fixture(); await h.apply(h.status(f, 'accepted')); await h.apply(h.status(f, 'running', 2));
  await h.resources.pool.query("UPDATE run SET pending_command='pause',command_sequence=5 WHERE id=$1", [f.id]);
  const before = await h.run(f); const worker = await h.isolated();
  try {
    const sent = await worker.send(JSON.stringify(h.status(f, 'paused', 3, { command_id: 'pause', command_sequence: 3, decision: 'accepted' })));
    await worker.waitForFailure(); await worker.assertUnacknowledged(sent); assert.deepEqual(await h.run(f), before);
  } finally { await worker.stop(); }
});
test('SW-15: result arriving before missing terminal status is held and then applied', async () => {
  const f = await h.fixture(); await h.apply(h.result(f, 2));
  assert.equal((await h.run(f)).status, 'trigger_requested'); assert.equal((await h.run(f)).resultEventAt, null);
  await h.apply(h.status(f, 'completed')); assert.equal((await h.run(f)).status, 'completed');
  assert.ok((await h.run(f)).resultEventAt); assert.equal((await h.run(f)).recoveryRequired, false);
});
test('SW-16: malformed record remains unacknowledged; no later offset is committed', async () => {
  const f = await h.fixture(); const worker = await h.isolated();
  try {
    const bad = await worker.send('{'); const later = await worker.send(JSON.stringify(h.status(f, 'accepted')));
    await worker.waitForFailure(); await worker.assertUnacknowledged(bad); await worker.assertUnacknowledged(later);
    assert.equal((await h.run(f)).status, 'trigger_requested');
  } finally { await worker.stop(); }
});
for (const reference of ['current-run', 'execution-parent'] as const) {
  test(`SW-17/${reference}: database prevents cross-scenario execution references`, async () => {
    const a = await h.fixture(); const b = await h.fixture();
    if (reference === 'current-run') {
      await assert.rejects(h.resources.pool.query('UPDATE scenario SET current_run_id=$1 WHERE id=$2', [a.id, b.scenarioId]), { code: '23503' });
    } else {
      await assert.rejects(h.resources.pool.query('UPDATE run SET retry_of_run_id=$1 WHERE id=$2', [a.id, b.id]), { code: '23503' });
    }
  });
}
test('SW-18: correlation identity is globally unique and execution cannot link to itself', async () => {
  const a = await h.fixture(); const b = await h.fixture();
  await assert.rejects(h.resources.pool.query('UPDATE run SET correlation_id=$1 WHERE id=$2', [a.correlationId, b.id]), { code: '23505' });
  await assert.rejects(h.resources.pool.query('UPDATE run SET retry_of_run_id=id WHERE id=$1', [a.id]), { code: '23514' });
});

test('SW-19: terminal status wins over an older action reference without claiming command success', async () => {
  const f = await h.fixture();
  await h.resources.pool.query("UPDATE run SET pending_command='pause',command_sequence=5 WHERE id=$1", [f.id]);
  await h.apply(h.status(f, 'failed', 1, { command_id: 'run', command_sequence: 1, decision: 'accepted' }));
  const saved = await h.run(f); assert.equal(saved.status, 'failed'); assert.equal(saved.pendingCommand, null);
  assert.equal(saved.decision, null);
});


/** Every rejection must preserve all three persistence boundaries, not just status. */
async function receipts(f: Fixture) {
  return (await h.resources.pool.query('SELECT sequence,payload FROM run_event_inbox WHERE run_id=$1 ORDER BY sequence', [f.id])).rows;
}
async function expectRejected(f: Fixture, event: unknown, code: RunEventRejectionCode = 'invalid_event_schema') {
  const before = { run: await h.run(f), scenario: await h.scenario(f), receipts: await receipts(f) };
  const worker = await h.isolated();
  try {
    const sent = await worker.send(JSON.stringify(event));
    await worker.waitForFailure(); worker.assertRejectedAs(code); await worker.assertUnacknowledged(sent);
    assert.deepEqual({ run: await h.run(f), scenario: await h.scenario(f), receipts: await receipts(f) }, before);
  } finally { await worker.stop(); }
}
async function running(f: Fixture) {
  await h.apply(h.status(f, 'accepted', 1)); await h.apply(h.status(f, 'running', 2));
}
async function pending(f: Fixture, command: 'run' | 'pause' | 'resume' | 'cancel', sequence = 7) {
  await h.resources.pool.query('UPDATE run SET pending_command=$1,command_sequence=$2,decision=NULL,command_reason=NULL WHERE id=$3', [command, sequence, f.id]);
}

for (const engine of ['emulator', 'simulator'] as const) {
  test(`SW-20/${engine}: successful Run stays pending through setup, binds optional ID, and clears at running`, async () => {
    const f = await h.fixture(engine); await pending(f, 'run', 1);
    await h.apply(h.status(f, 'accepted', 1, { run_id: undefined, command_id: 'run', command_sequence: 1, decision: 'accepted' }));
    assert.equal((await h.run(f)).pendingCommand, 'run'); assert.equal((await h.run(f)).engineRunId, null);
    const ready = h.status(f, 'setup_ready', 2, { command_id: 'run', command_sequence: 1, decision: 'accepted',
      engine_version: 'test-build', message: 'Setup complete', engine_ref: { instance_url: 'https://engine.example/live' } });
    await h.apply(ready); const setup = await h.run(f);
    assert.equal(setup.pendingCommand, 'run'); assert.equal(setup.engineRunId, f.engineId);
    assert.equal(setup.statusMessage, ready.message); assert.deepEqual(JSON.parse(setup.engineRef!), ready.engine_ref);
    assert.equal((await receipts(f))[1].payload.engine_version, 'test-build');
    await h.apply(h.status(f, 'running', 3, { command_id: 'run', command_sequence: 1, decision: 'accepted', run_id: undefined }));
    const saved = await h.run(f); assert.equal(saved.pendingCommand, null); assert.equal(saved.engineRunId, f.engineId);
    assert.equal(saved.status, 'running'); assert.equal(saved.decision, 'accepted');
  });
}
for (const command of ['pause', 'resume', 'cancel'] as const) {
  test(`SW-21/${command}: rejection leaves state and execution reason unchanged`, async () => {
    const f = await h.fixture(); await running(f);
    const state = command === 'resume' ? 'paused' : 'running';
    if (command === 'resume') await h.apply(h.status(f, 'paused', 3));
    const seq = command === 'resume' ? 4 : 3; await pending(f, command);
    await h.resources.pool.query("UPDATE run SET reason='existing_execution_reason' WHERE id=$1", [f.id]);
    await h.apply(h.status(f, state, seq, { command_id: command, command_sequence: 7, decision: 'rejected', reason: 'capability_unavailable' }));
    const saved = await h.run(f);
    assert.equal(saved.status, state); assert.equal(saved.pendingCommand, null);
    assert.equal(saved.decision, 'rejected'); assert.equal(saved.commandReason, 'capability_unavailable');
    assert.equal(saved.reason, 'existing_execution_reason'); assert.equal(saved.completedAt, null);
  });
}
test('SW-22: unrelated destination does not clear a command; correlated destination without a decision does', async () => {
  const f = await h.fixture(); await running(f); await pending(f, 'pause');
  await h.apply(h.status(f, 'paused', 3, { decision: null }));
  assert.equal((await h.run(f)).pendingCommand, 'pause');
  await h.apply(h.status(f, 'paused', 4, { command_id: 'pause', command_sequence: 7, decision: null }));
  assert.equal((await h.run(f)).pendingCommand, null);
});
test('SW-23: resuming is an intermediate engine state and only running clears Resume', async () => {
  const f = await h.fixture(); await running(f); await h.apply(h.status(f, 'paused', 3)); await pending(f, 'resume');
  await h.apply(h.status(f, 'resuming', 4, { command_id: 'resume', command_sequence: 7, decision: 'accepted' }));
  assert.equal((await h.run(f)).pendingCommand, 'resume'); assert.equal((await h.scenario(f)).status, 'paused');
  await h.apply(h.status(f, 'running', 5, { command_id: 'resume', command_sequence: 7 }));
  assert.equal((await h.run(f)).pendingCommand, null); assert.equal((await h.scenario(f)).status, 'running');
});
for (const command of ['run', 'resume', 'cancel'] as const) {
  for (const final of ['completed', 'failed', 'cancelled'] as const) {
    test(`SW-24/${command}/${final}: any terminal state resolves pending command without fabricating acceptance`, async () => {
      const f = await h.fixture(); await pending(f, command);
      await h.apply(h.status(f, final)); const saved = await h.run(f);
      assert.equal(saved.pendingCommand, null); assert.equal(saved.decision, null);
      assert.equal(saved.status, final); assert.ok(saved.completedAt);
    });
  }
}
test('SW-25: exact old Pause response cannot clear a new Pause after a resume cycle', async () => {
  const f = await h.fixture(); await running(f); await pending(f, 'pause', 1);
  const old = h.status(f, 'paused', 3, { command_id: 'pause', command_sequence: 1, decision: 'accepted' });
  await h.apply(old); await h.apply(h.status(f, 'running', 4)); await pending(f, 'pause', 2);
  const before = await h.run(f); await h.apply(old); assert.deepEqual(await h.run(f), before);
  await h.apply(h.status(f, 'paused', 5, { command_id: 'pause', command_sequence: 2, decision: 'accepted' }));
  assert.equal((await h.run(f)).pendingCommand, null);
});
for (const [name, patch] of [
  ['different action', { command_id: 'cancel', command_sequence: 7 }],
  ['future command', { command_id: 'pause', command_sequence: 8 }],
  ['rejection changing state', { command_id: 'pause', command_sequence: 7, decision: 'rejected', status: 'paused', reason: 'busy' }],
] as const) {
  test(`SW-26/${name}: command mismatch is not applied`, async () => {
    const f = await h.fixture(); await running(f); await pending(f, 'pause');
    await expectRejected(f, { ...h.status(f, 'running', 3), ...patch });
  });
}
test('SW-27: unknown correlation never creates an orphan execution or receipt', async () => {
  const f = await h.fixture(); const unknown = randomUUID();
  await expectRejected(f, h.status(f, 'accepted', 1, { correlation_id: unknown }), 'unknown_correlation');
  const rows = await h.resources.pool.query('SELECT id FROM run WHERE correlation_id=$1', [unknown]); assert.equal(rows.rowCount, 0);
});
test('SW-28: bound engine run ID cannot be replaced or erased by an omitted ID', async () => {
  const f = await h.fixture(); await h.apply(h.status(f, 'accepted'));
  await expectRejected(f, h.status(f, 'running', 2, { run_id: randomUUID() }), 'engine_run_id_mismatch');
  await h.apply(h.status(f, 'setup_ready', 2, { run_id: undefined }));
  assert.equal((await h.run(f)).engineRunId, f.engineId);
  await h.apply(h.status(f, 'failed', 3, { run_id: undefined }));
  await h.apply({ ...h.result(f, 4), run_id: undefined }); assert.equal((await h.run(f)).engineRunId, f.engineId);
});
for (const [name, patch, code] of [
  ['blank correlation', { correlation_id: ' ' }, 'invalid_correlation_id'],
  ['null correlation', { correlation_id: null }, 'invalid_correlation_id'],
  ['blank engine ID', { run_id: ' ' }, 'invalid_engine_run_id'],
  ['null engine ID', { run_id: null }, 'invalid_engine_run_id'],
  ['unknown engine', { engine: 'other' }, 'invalid_event_schema'],
  ['missing event type', { event_type: undefined }, 'invalid_event_schema'],
  ['unknown event type', { event_type: 'run.other' }, 'invalid_event_schema'],
  ['bad timestamp', { emitted_at: 'yesterday' }, 'invalid_event_schema'],
  ['missing timestamp', { emitted_at: undefined }, 'invalid_event_schema'],
  ['negative sequence', { sequence: -1 }, 'invalid_event_schema'],
  ['fractional sequence', { sequence: 1.5 }, 'invalid_event_schema'],
  ['unsafe sequence', { sequence: Number.MAX_SAFE_INTEGER + 1 }, 'invalid_event_schema'],
  ['missing sequence', { sequence: undefined }, 'invalid_event_schema'],
  ['command without counter', { command_id: 'pause' }, 'invalid_event_schema'],
  ['counter without command', { command_sequence: 1 }, 'invalid_event_schema'],
  ['decision without command', { decision: 'accepted' }, 'invalid_event_schema'],
  ['unknown command', { command_id: 'stop', command_sequence: 1 }, 'invalid_event_schema'],
  ['unknown decision', { command_id: 'run', command_sequence: 1, decision: 'done' }, 'invalid_event_schema'],
  ['failure without reason', { status: 'failed' }, 'invalid_event_schema'],
  ['rejection without reason', { command_id: 'pause', command_sequence: 1, decision: 'rejected' }, 'invalid_event_schema'],
  ['Run rejection not failed', { command_id: 'run', command_sequence: 1, decision: 'rejected', reason: 'invalid' }, 'invalid_event_schema'],
  ['API-owned pausing', { status: 'pausing' }, 'invalid_event_schema'],
  ['API-owned cancelling', { status: 'cancelling' }, 'invalid_event_schema'],
  ['extra field', { unexpected: true }, 'invalid_event_schema'],
  ['unsafe engine URL', { engine_ref: { instance_url: 'javascript:alert(1)' } }, 'invalid_event_schema'],
] as const) {
  test(`SW-29/${name}: invalid envelope is rejected atomically`, async () => {
    const f = await h.fixture(); await expectRejected(f, { ...h.status(f, 'accepted'), ...patch }, code);
  });
}
for (const body of [null, '', '{', 'null', '[]', '{}']) {
  test(`SW-30/${JSON.stringify(body)}: malformed or empty record remains uncommitted`, async () => {
    const f = await h.fixture(); const before = await h.run(f); const worker = await h.isolated();
    try {
      const sent = await worker.send(body); await worker.waitForFailure(); await worker.assertUnacknowledged(sent);
      assert.deepEqual(await h.run(f), before); assert.deepEqual(await receipts(f), []);
    } finally { await worker.stop(); }
  });
}
test('SW-31: multiple sequence gaps only clear after every missing prefix is repaired', async () => {
  const f = await h.fixture(); await h.apply(h.status(f, 'accepted'));
  await h.apply(h.status(f, 'paused', 4)); await h.apply(h.status(f, 'completed', 6)); await h.apply(h.result(f, 7));
  assert.equal((await h.run(f)).lastEventSequence, 1);
  await h.apply(h.status(f, 'setup_ready', 2)); assert.equal((await h.run(f)).lastEventSequence, 2);
  assert.equal((await h.run(f)).recoveryRequired, true);
  await h.apply(h.status(f, 'running', 3)); assert.equal((await h.run(f)).lastEventSequence, 4);
  assert.equal((await h.run(f)).status, 'paused'); assert.equal((await h.run(f)).recoveryRequired, true);
  await h.apply(h.status(f, 'running', 5)); const saved = await h.run(f);
  assert.equal(saved.lastEventSequence, 7); assert.equal(saved.status, 'completed');
  assert.equal(saved.recoveryRequired, false); assert.ok(saved.resultEventAt); assert.equal((await receipts(f)).length, 7);
});
test('SW-32: a duplicate held event is safe but a changed held payload is rejected', async () => {
  const f = await h.fixture(); const held = h.status(f, 'paused', 3); await h.apply(held);
  const before = await h.run(f); await h.apply(held); assert.deepEqual(await h.run(f), before);
  assert.equal((await receipts(f)).length, 1);
  await expectRejected(f, { ...held, message: 'changed payload' });
  await h.apply(h.status(f, 'accepted')); await h.apply(h.status(f, 'running', 2));
  assert.equal((await h.run(f)).status, 'paused');
});
test('SW-33: rollback during multi-event replay preserves held records and retries the entire prefix', async () => {
  const f = await h.fixture(); await h.apply(h.status(f, 'accepted'));
  await h.apply(h.status(f, 'paused', 3)); await h.apply(h.status(f, 'running', 4));
  await h.apply(h.status(f, 'completed', 5)); const result = h.result(f, 6); await h.apply(result);
  const before = await h.run(f); const held = await receipts(f);
  const constraint = 'replay_' + randomUUID().replaceAll('-', '');
  await h.resources.pool.query(`ALTER TABLE scenario ADD CONSTRAINT "${constraint}" CHECK (id <> '${f.scenarioId}'::uuid OR status <> 'finished')`);
  let worker = await h.isolated();
  try {
    const sent = await worker.send(JSON.stringify(h.status(f, 'running', 2)));
    await worker.waitForFailure(); await worker.assertUnacknowledged(sent);
    assert.deepEqual(await h.run(f), before); assert.deepEqual(await receipts(f), held);
    await worker.stop(); await h.resources.pool.query(`ALTER TABLE scenario DROP CONSTRAINT "${constraint}"`);
    worker = await h.isolated({ groupId: worker.groupId, topics: worker.topics }); await h.acknowledged(sent, worker.groupId);
    const saved = await h.run(f); assert.equal(saved.lastEventSequence, 6); assert.equal(saved.recoveryRequired, false);
    assert.deepEqual(saved.results, result.results); assert.equal((await receipts(f)).length, 6);
  } finally { await worker.stop(); await h.resources.pool.query(`ALTER TABLE scenario DROP CONSTRAINT IF EXISTS "${constraint}"`); }
});
test('SW-34: producer timestamps cannot suppress higher sequence state or results', async () => {
  const f = await h.fixture(); const future = '2030-01-01T00:00:00Z', past = '2020-01-01T00:00:00Z';
  await h.apply(h.status(f, 'accepted', 1, { emitted_at: future }));
  await h.apply(h.status(f, 'running', 2, { emitted_at: past })); assert.equal((await h.run(f)).status, 'running');
  await h.apply(h.status(f, 'completed', 3, { emitted_at: future }));
  await h.apply({ ...h.result(f, 4), emitted_at: past });
  const saved = await h.run(f); assert.equal(saved.resultEventAt?.toISOString(), new Date(past).toISOString());
  assert.equal(saved.completedAt?.toISOString(), new Date(future).toISOString()); assert.equal(saved.lastEventSequence, 4);
});
for (const [name, initial, eventType, nextStatus] of [
  ['active result', 'accepted', 'result', null], ['cancelled result', 'cancelled', 'result', null],
  ['terminal reopening', 'completed', 'status', 'running'], ['conflicting terminal', 'completed', 'status', 'failed'],
  ['stage regression', 'running', 'status', 'accepted'],
] as const) {
  test(`SW-35/${name}: contradictory lifecycle event is rejected`, async () => {
    const f = await h.fixture();
    if (initial === 'running') await running(f); else await h.apply(h.status(f, initial));
    const seq = initial === 'running' ? 3 : 2;
    await expectRejected(f, eventType === 'result' ? h.result(f, seq) : h.status(f, nextStatus!, seq));
  });
}
test('SW-36: a second result with a new sequence cannot replace the final result', async () => {
  const f = await h.fixture(); await h.apply(h.status(f, 'completed')); await h.apply(h.result(f, 2));
  await expectRejected(f, h.result(f, 3, { overwritten: true }));
});
for (const [name, patch] of [
  ['removed status', { status: 'success' }], ['removed verdict', { verdict: 'success' }],
  ['missing results', { results: undefined }], ['array results', { results: [] }], ['null results', { results: null }],
] as const) {
  test(`SW-37/${name}: invalid result contract is rejected`, async () => {
    const f = await h.fixture(); await h.apply(h.status(f, 'completed')); await expectRejected(f, { ...h.result(f), ...patch });
  });
}
test('SW-38: empty results and an unfamiliar failure reason are valid', async () => {
  const f = await h.fixture(); await h.apply(h.status(f, 'failed', 1, { reason: 'new_engine_reason' }));
  await h.apply(h.result(f, 2, {})); const saved = await h.run(f);
  assert.equal(saved.reason, 'new_engine_reason'); assert.deepEqual(saved.results, {}); assert.ok(saved.resultEventAt);
});
test('SW-39: exact old status redelivery after termination is a verified no-op', async () => {
  const f = await h.fixture(); const accepted = h.status(f, 'accepted'); await h.apply(accepted);
  await h.apply(h.status(f, 'completed', 2)); const before = await h.run(f);
  await h.apply(accepted); assert.deepEqual(await h.run(f), before); assert.equal((await receipts(f)).length, 2);
});
test('SW-40: fresh health advances observation, older health cannot erase progress or pending command', async () => {
  const f = await h.fixture(); await running(f); await pending(f, 'pause');
  const health: RunEvent = { event_type: 'run.heartbeat', engine: f.engine, correlation_id: f.correlationId,
    emitted_at: '2026-10-25T10:00:00Z', progress: { n: 2 } };
  await h.apply(health); const before = await h.run(f);
  await h.apply({ ...health, emitted_at: '2026-10-25T09:00:00Z', progress: { n: 1 } });
  assert.deepEqual(await h.run(f), before);
  await h.apply({ ...health, emitted_at: '2026-10-25T11:00:00Z', progress: { n: 3 } });
  const after = await h.run(f); assert.deepEqual(after.progress, { n: 3 });
  assert.equal(after.pendingCommand, 'pause'); assert.equal(after.lastEventSequence, 2); assert.equal(after.status, 'running');
});
for (const final of ['completed', 'failed', 'cancelled'] as const) {
  test(`SW-41/${final}: terminal health observation is acknowledged without changing any record`, async () => {
    const f = await h.fixture(); await h.apply(h.status(f, final)); const before = await h.run(f);
    await h.apply({ event_type: 'run.heartbeat', correlation_id: f.correlationId, engine: f.engine, emitted_at: h.now(), progress: { n: 10 } });
    assert.deepEqual(await h.run(f), before);
  });
}
for (const [name, patch] of [['invalid progress', { progress: [] }], ['counter scope undefined', { sequence: 1 }]] as const) {
  test(`SW-42/${name}: invalid heartbeat is rejected without refreshing health`, async () => {
    const f = await h.fixture(); await expectRejected(f, { event_type: 'run.heartbeat', correlation_id: f.correlationId, engine: f.engine, emitted_at: h.now(), ...patch });
  });
}
test('SW-43: two independent consumers serialize duplicate and out-of-order deliveries on one execution', async () => {
  const f = await h.fixture(); const one = await h.isolated(); const two = await h.isolated({ topics: one.topics });
  const client = await h.resources.pool.connect(); let released = false;
  try {
    // Hold the same locks as the repository until both consumers attempt delivery.
    // This makes contention deterministic rather than relying on a timing sleep.
    await client.query('BEGIN'); await client.query('SELECT id FROM scenario WHERE id=$1 FOR UPDATE', [f.scenarioId]);
    await client.query('SELECT id FROM run WHERE id=$1 FOR UPDATE', [f.id]);
    const first = await one.send(JSON.stringify(h.status(f, 'accepted')));
    await eventually(async () => one.deliveries.length > 0 && two.deliveries.length > 0, 'both independent consumers must enter processing');
    await client.query('COMMIT'); released = true;
    await Promise.all([h.acknowledged(first, one.groupId), h.acknowledged(first, two.groupId)]);
    const later = await one.send(JSON.stringify(h.status(f, 'paused', 3)));
    await Promise.all([h.acknowledged(later, one.groupId), h.acknowledged(later, two.groupId)]);
    const repair = await one.send(JSON.stringify(h.status(f, 'running', 2)));
    await Promise.all([h.acknowledged(repair, one.groupId), h.acknowledged(repair, two.groupId)]);
    const saved = await h.run(f); assert.equal(saved.status, 'paused'); assert.equal(saved.lastEventSequence, 3);
    assert.equal(saved.recoveryRequired, false); assert.equal((await receipts(f)).length, 3);
    assert.equal((await h.scenario(f)).status, 'paused');
  } finally {
    if (!released) await client.query('ROLLBACK'); client.release(); await Promise.all([one.stop(), two.stop()]);
  }
});


/** Reproduce CI's coordinator responses on the observer; real delivery/storage remain unchanged. */
async function withCoordinatorErrors(check: () => Promise<void>) {
  const original = h.admin.fetchOffsets;
  let attempts = 0;
  h.admin.fetchOffsets = async options => {
    const code = [14, 15, 16][attempts++];
    if (code !== undefined) throw new KafkaJSProtocolError(Object.assign(new Error(`Injected coordinator error ${code}`), {
      code, type: 'TEST_COORDINATOR_ERROR', retriable: true,
    }));
    return original(options);
  };
  try { await check(); assert.ok(attempts >= 4, 'Observer must retry coordinator errors before verifying offsets'); }
  finally { h.admin.fetchOffsets = original; }
}
test('SW-44: committed-offset polling survives coordinator loading, unavailability and rediscovery', async () => {
  const f = await h.fixture();
  await withCoordinatorErrors(() => h.apply(h.status(f, 'accepted')));
  assert.equal((await h.run(f)).status, 'accepted'); assert.equal((await h.run(f)).lastEventSequence, 1);
  assert.equal((await receipts(f)).length, 1);
});
test('SW-45: rejected-offset verification retries coordinator errors without accepting invalid events', async () => {
  const f = await h.fixture(); const before = await h.run(f); const worker = await h.isolated();
  try {
    const sent = await worker.send('{'); await worker.waitForFailure();
    await withCoordinatorErrors(() => worker.assertUnacknowledged(sent));
    assert.deepEqual(await h.run(f), before); assert.deepEqual(await receipts(f), []);
  } finally { await worker.stop(); }
});


async function withFreshDatabase(check: (pool: Pool) => Promise<void>) {
  const name = 'module_bootstrap_' + randomUUID().replaceAll('-', '');
  await h.resources.pool.query(`CREATE DATABASE "${name}"`);
  const url = new URL(h.resources.pool.options.connectionString!); url.pathname = '/' + name;
  const pool = new Pool({ connectionString: url.toString(), max: 2 });
  try { await check(pool); }
  finally { await pool.end(); await h.resources.pool.query(`DROP DATABASE "${name}"`); }
}
test('SW-46: repeating the single schema script preserves execution data and needs no migration history', async () => {
  const f = await h.fixture(); await h.apply(h.status(f, 'accepted'));
  const before = { run: await h.run(f), scenario: await h.scenario(f), receipts: await receipts(f) };
  await h.resources.pool.query(await readFile('db/schema.sql', 'utf8'));
  assert.deepEqual({ run: await h.run(f), scenario: await h.scenario(f), receipts: await receipts(f) }, before);
  const history = await h.resources.pool.query("SELECT to_regclass('drizzle.__drizzle_migrations') AS history");
  assert.equal(history.rows[0].history, null);
  await h.apply(h.status(f, 'running', 2)); assert.equal((await h.run(f)).status, 'running');
});
test('SW-47: a partial existing schema is rejected without altering its data', async () => {
  await withFreshDatabase(async pool => {
    await pool.query("CREATE TABLE scenario(marker text); INSERT INTO scenario VALUES ('preserve')");
    const client = await pool.connect();
    try {
      await assert.rejects(client.query(await readFile('db/schema.sql', 'utf8')), /Partial Scenario Manager schema/);
    } finally { await client.query('ROLLBACK'); client.release(); }
    assert.deepEqual((await pool.query('SELECT * FROM scenario')).rows, [{ marker: 'preserve' }]);
    const missing = await pool.query("SELECT to_regclass('public.run') AS run, to_regclass('public.run_event_inbox') AS inbox");
    assert.deepEqual(missing.rows[0], { run: null, inbox: null });
  });
});
test('SW-48: a failed fresh initialization rolls back newly created schema objects', async () => {
  await withFreshDatabase(async pool => {
    await pool.query("CREATE TYPE run_engine AS ENUM ('existing')");
    const client = await pool.connect();
    try { await assert.rejects(client.query(await readFile('db/schema.sql', 'utf8')), { code: '42710' }); }
    finally { await client.query('ROLLBACK'); client.release(); }
    const objects = await pool.query("SELECT to_regtype('public.scenario_status') AS status, to_regclass('public.scenario') AS scenario");
    assert.deepEqual(objects.rows[0], { status: null, scenario: null });
    assert.equal((await pool.query("SELECT 'existing'::run_engine AS engine")).rows[0].engine, 'existing');
  });
});
test('SW-49: concurrent initializers create one complete schema without a migration chain', async () => {
  await withFreshDatabase(async pool => {
    const sql = await readFile('db/schema.sql', 'utf8');
    await Promise.all([pool.query(sql), pool.query(sql)]);
    const tables = await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
    assert.deepEqual(tables.rows.map(r => r.tablename), ['run', 'run_event_inbox', 'scenario']);
    const defaults = await pool.query("SELECT column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='run' AND column_name='status'");
    assert.match(defaults.rows[0].column_default, /trigger_requested/);
  });
});
