import { z } from 'zod';
import { commandValues, decisionValues, runEngineValues, engineRunStatusValues } from '../../runs/domain/run-state.js';
import { RunEventRejectedError, type RunEventRejectionCode } from './run-event-rejection.js';

const positiveSequence = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const envelope = {
  correlation_id: z.string().trim().min(1),
  // Engines are black boxes: an event remains identifiable before run_id exists.
  run_id: z.string().trim().min(1).optional(),
  engine: z.enum(runEngineValues),
  emitted_at: z.iso.datetime({ offset: true }),
  // TODO: agree schema version and compatibility rollout with both engine teams.
  version: z.string().optional(),
};
const statusSchema = z.strictObject({
  ...envelope, event_type: z.literal('run.status'), sequence: positiveSequence,
  status: z.enum(engineRunStatusValues),
  command_id: z.enum(commandValues).optional(), command_sequence: positiveSequence.optional(),
  decision: z.enum(decisionValues).nullable().optional(),
  reason: z.string().optional(), message: z.string().optional(), engine_version: z.string().optional(),
  engine_ref: z.strictObject({
    instance_url: z.url({ protocol: /^https?$/ }).optional(),
    live_socket: z.url({ protocol: /^wss?$/ }).optional(),
  }).optional(),
}).superRefine((event, ctx) => {
  // An action enum cannot identify repeated requests: require its echoed counter.
  if ((event.command_id !== undefined) !== (event.command_sequence !== undefined) ||
      (event.decision != null && event.command_id === undefined)) {
    ctx.addIssue({ code: 'custom', message: 'Command identity is incomplete' });
  }
  if ((event.decision === 'rejected' || event.status === 'failed') && !event.reason?.trim()) {
    ctx.addIssue({ code: 'custom', message: 'Rejection/failure requires a reason' });
  }
  // Run rejection must close the already-created SM execution explicitly.
  if (event.command_id === 'run' && event.decision === 'rejected' && event.status !== 'failed') {
    ctx.addIssue({ code: 'custom', message: 'Run rejection must report failed' });
  }
});
export const runEventSchema = z.discriminatedUnion('event_type', [
  statusSchema,
  z.strictObject({ ...envelope, event_type: z.literal('run.result'), sequence: positiveSequence,
    // Execution outcome comes from terminal status; engine metrics remain opaque.
    results: z.record(z.string(), z.json()),
  }),
  z.strictObject({ ...envelope, event_type: z.literal('run.heartbeat'),
    // TODO: agree heartbeat sequencing/frequency; do not consume status counter slots.
    progress: z.record(z.string(), z.json()).optional(),
  }),
]);
export type RunEvent = z.infer<typeof runEventSchema>;
export type OrderedRunEvent = Exclude<RunEvent, { event_type: 'run.heartbeat' }>;
export class InvalidRunEventError extends RunEventRejectedError {
  constructor(code: Extract<RunEventRejectionCode,
    'empty_event' | 'malformed_json' | 'invalid_execution_identity' |
    'invalid_correlation_id' | 'invalid_engine_run_id' | 'invalid_event_schema'
  > = 'invalid_event_schema') { super(code, 'Invalid run event'); }
}
export function parseRunEvent(value: Buffer | null): RunEvent {
  if (!value?.length) throw new InvalidRunEventError('empty_event');
  let input: unknown;
  try { input = JSON.parse(value.toString('utf8')); }
  catch { throw new InvalidRunEventError('malformed_json'); }
  const result = runEventSchema.safeParse(input);
  if (!result.success) {
    const invalidCorrelation = result.error.issues.some((issue) => issue.path[0] === 'correlation_id');
    const invalidEngineRun = result.error.issues.some((issue) => issue.path[0] === 'run_id');
    if (invalidCorrelation && invalidEngineRun) throw new InvalidRunEventError('invalid_execution_identity');
    if (invalidCorrelation) throw new InvalidRunEventError('invalid_correlation_id');
    if (invalidEngineRun) throw new InvalidRunEventError('invalid_engine_run_id');
    throw new InvalidRunEventError();
  }
  return result.data;
}
