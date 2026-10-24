import type { RunEvent } from '../status-worker/domain/run-event.js';

export function demoStatus(correlationId: string, engineRunId: string,
  status: Extract<RunEvent, { event_type: 'run.status' }>['status'], emittedAt: string): RunEvent {
  return {
    event_type: 'run.status', correlation_id: correlationId, run_id: engineRunId,
    engine: 'emulator', status, emitted_at: emittedAt,
    ...(status === 'failed' ? { reason: 'local_demo_failure', message: 'Intentional local test failure' } : {}),
    ...(status === 'setup_ready' ? { engine_ref: {
      instance_url: `http://localhost:3000/demo/${engineRunId}`,
      live_socket: `ws://localhost:3000/demo/${engineRunId}`,
    } } : {}),
  };
}

export function demoResult(correlationId: string, engineRunId: string, emittedAt: string,
  marker: string, status: 'success' | 'failure' = 'success'): RunEvent {
  return {
    event_type: 'run.result', correlation_id: correlationId, run_id: engineRunId,
    engine: 'emulator', status, emitted_at: emittedAt,
    results: { demo_marker: marker, throughput_uph: 2840, orders: { processed: 30180 } },
  };
}
