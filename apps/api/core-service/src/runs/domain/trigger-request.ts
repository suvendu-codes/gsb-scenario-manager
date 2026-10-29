import { createHash } from 'node:crypto';
import { z } from 'zod';
import { RUN_ENGINES, RUN_PRIORITIES } from './run.js';

/**
 * Trigger request body (LLD §5): only the engine and the priority. Everything the engine needs —
 * project, map, config and data files — is read from the stored scenario.
 */
export const TriggerRequestSchema = z
  .object({
    engine: z.enum(RUN_ENGINES),
    priority: z.enum(RUN_PRIORITIES).default('normal'),
  })
  .strict();

export type TriggerRequest = z.output<typeof TriggerRequestSchema>;
export type TriggerRequestInput = z.input<typeof TriggerRequestSchema>;

/** Idempotency-Key: required, printable ASCII, at most 200 characters (a UUID is recommended). */
export const IdempotencyKeySchema = z
  .string({ error: 'The Idempotency-Key header is required' })
  .trim()
  .min(1, 'The Idempotency-Key header is required')
  .max(200, 'Idempotency-Key must be at most 200 characters')
  .regex(/^[\x21-\x7e]+$/, 'Idempotency-Key must be printable ASCII without spaces');

/** Deterministic JSON (sorted keys, undefined dropped) so equal requests hash equally. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(',')}}`;
}

/** Fingerprint of the request an Idempotency-Key was first used with. */
export const hashTriggerRequest = (scenarioId: string, request: TriggerRequest) =>
  createHash('sha256').update(canonicalJson({ scenarioId, request })).digest('hex');
