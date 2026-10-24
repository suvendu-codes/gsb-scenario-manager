import { z } from 'zod';
import { runEngineValues, runStatusValues, runVerdictValues } from '../../runs/domain/run-state.js';

const envelope = {
  correlation_id: z.string().trim().min(1),
  run_id: z.string().trim().min(1),
  engine: z.enum(runEngineValues),
  emitted_at: z.iso.datetime({ offset: true }),
  // The proposal includes an empty version on results and omits it on statuses.
  version: z.string().optional(),
};

export const runEventSchema = z.discriminatedUnion('event_type', [
  z.strictObject({
    ...envelope,
    event_type: z.literal('run.status'),
    status: z.enum(runStatusValues),
    reason: z.string().optional(),
    message: z.string().optional(),
    engine_ref: z.strictObject({
      instance_url: z.url({ protocol: /^https?$/ }),
      live_socket: z.url({ protocol: /^wss?$/ }),
    }).optional(),
  }),
  z.strictObject({
    ...envelope,
    event_type: z.literal('run.result'),
    status: z.enum(runVerdictValues),
    // Metrics are engine-specific; preserve JSON fields without a lossy projection.
    results: z.record(z.string(), z.json()),
  }),
]);

export type RunEvent = z.infer<typeof runEventSchema>;

export class InvalidRunEventError extends Error {
  constructor() { super('Invalid run event'); }
}

export function parseRunEvent(value: Buffer | null): RunEvent {
  if (!value) throw new InvalidRunEventError();
  let input: unknown;
  try { input = JSON.parse(value.toString('utf8')); }
  catch { throw new InvalidRunEventError(); }
  const result = runEventSchema.safeParse(input);
  if (!result.success) throw new InvalidRunEventError();
  return result.data;
}
