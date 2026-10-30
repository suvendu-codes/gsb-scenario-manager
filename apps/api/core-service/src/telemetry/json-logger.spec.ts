import { describe, expect, it, vi } from 'vitest';

const spanContext = vi.hoisted(() => ({ current: undefined as undefined | object }));
vi.mock('@opentelemetry/api', () => ({
  trace: {
    getActiveSpan: () =>
      spanContext.current ? { spanContext: () => spanContext.current } : undefined,
  },
}));

import { JsonLogger } from './json-logger.js';

function setup(level?: string, service = '') {
  const out: string[] = [];
  const err: string[] = [];
  const logger = new JsonLogger({
    level,
    service,
    stdout: (l) => out.push(l),
    stderr: (l) => err.push(l),
    now: () => new Date('2026-01-02T03:04:05.000Z'),
  });
  return { logger, out, err };
}

describe('JsonLogger', () => {
  it('writes one JSON line with level, context and message', () => {
    const { logger, out } = setup();
    logger.log('hello', 'Bootstrap');
    expect(out).toHaveLength(1);
    expect(out[0]!.endsWith('\n')).toBe(true);
    expect(JSON.parse(out[0]!)).toEqual({
      timestamp: '2026-01-02T03:04:05.000Z',
      level: 'info',
      context: 'Bootstrap',
      message: 'hello',
    });
  });

  it('adds the service name when configured', () => {
    const { logger, out } = setup(undefined, 'scenario-manager-api');
    logger.log('hello');
    expect(JSON.parse(out[0]!).service).toBe('scenario-manager-api');
  });

  it('accepts log as an alias of info for LOG_LEVEL', () => {
    const { logger, out } = setup('log');
    logger.log('kept');
    logger.debug('skipped');
    expect(out).toHaveLength(1);
  });

  it('spreads object messages into top-level fields', () => {
    const { logger, out } = setup();
    logger.log({ event: 'worker_ready', runId: 'r1' }, 'WorkerBootstrap');
    expect(JSON.parse(out[0]!)).toMatchObject({
      event: 'worker_ready',
      runId: 'r1',
      context: 'WorkerBootstrap',
    });
  });

  it('sends errors to stderr with the stack', () => {
    const { logger, out, err } = setup();
    logger.error('boom', 'trace-line', 'HTTP');
    expect(out).toHaveLength(0);
    expect(JSON.parse(err[0]!)).toMatchObject({
      level: 'error',
      message: 'boom',
      stack: 'trace-line',
      context: 'HTTP',
    });
  });

  it('serializes Error instances', () => {
    const { logger, err } = setup();
    logger.error(new Error('bad'));
    const entry = JSON.parse(err[0]!);
    expect(entry.message).toBe('bad');
    expect(entry.stack).toContain('Error: bad');
  });

  it('filters below the configured level', () => {
    const { logger, out, err } = setup('warn');
    logger.log('skip');
    logger.debug('skip');
    logger.warn('keep');
    logger.error('keep');
    expect(out.map((l) => JSON.parse(l).message)).toEqual(['keep']);
    expect(err).toHaveLength(1);
  });

  it('adds trace_id and span_id when a span is active', () => {
    const { logger, out } = setup();
    spanContext.current = { traceId: 'a'.repeat(32), spanId: 'b'.repeat(16) };
    logger.log('in span');
    spanContext.current = undefined;
    logger.log('no span');
    expect(JSON.parse(out[0]!)).toMatchObject({
      trace_id: 'a'.repeat(32),
      span_id: 'b'.repeat(16),
    });
    expect(JSON.parse(out[1]!).trace_id).toBeUndefined();
  });
});
