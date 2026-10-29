import { createHash } from 'node:crypto';
import { z } from 'zod';
import { RUN_ENGINES, RUN_PRIORITIES } from './run.js';

/**
 * What the caller supplies to start an execution. SM-owned identity (project, scenario, map)
 * comes from the stored scenario; everything here is the pinned execution snapshot that the
 * scenario does not persist yet (Event Schema Proposal §4 "Trigger inputs").
 */

const notLatest = (v: string) => v.trim().toLowerCase() !== 'latest';
const pinVersion = z
  .string()
  .trim()
  .min(1)
  .refine(notLatest, 'must be an exact version, not "latest"');

export const DATA_SLOTS = ['inbound', 'outbound', 'masterdata', 'mockput'] as const;
export type DataSlot = (typeof DATA_SLOTS)[number];

export const GS_URI_REGEX = /^gs:\/\/[a-z0-9][a-z0-9._-]{1,220}[a-z0-9]\/\S+$/;

export const PinSchema = z
  .object({
    service: z.string().trim().min(1).meta({ example: 'foundry_solution' }),
    artifactType: z.string().trim().min(1).meta({ example: 'solution' }),
    id: z.string().trim().min(1),
    version: pinVersion.optional(),
    versionId: pinVersion.optional(),
    etag: z.string().trim().min(1).optional(),
  })
  .strict()
  .refine((p) => p.version !== undefined || p.versionId !== undefined, {
    message: 'a pin needs version or versionId',
    path: ['versionId'],
  });

export const DataFileSchema = z
  .object({
    uri: z.string().regex(GS_URI_REGEX, 'uri must be a gs://<bucket>/<object> URI'),
    sha256: z
      .string()
      .regex(/^[0-9a-f]{64}$/, 'sha256 must be 64 lowercase hex characters'),
    sizeBytes: z.number().int().nonnegative(),
    rows: z.number().int().nonnegative(),
  })
  .strict();

const jsonObject = z.record(z.string(), z.unknown());

export const TriggerRequestSchema = z
  .object({
    engine: z.enum(RUN_ENGINES),
    priority: z.enum(RUN_PRIORITIES).default('normal'),
    issuedBy: z.string().trim().min(1).max(320).optional().meta({
      description: 'Audit context only (who clicked Run); not authorization.',
    }),
    references: z
      .object({
        mapVersionId: z.string().trim().min(1).optional(),
        pins: z.array(PinSchema).min(1),
      })
      .strict(),
    build: jsonObject.optional().meta({ description: 'Engine build selection (engine-specific).' }),
    data: z
      .object({
        inbound: DataFileSchema.optional(),
        outbound: DataFileSchema.optional(),
        masterdata: DataFileSchema.optional(),
        mockput: DataFileSchema.optional(),
      })
      .strict()
      .default({}),
    config: jsonObject.meta({ description: 'Engine-specific configuration modules, sent inline.' }),
    run: z
      .object({
        executionDurationMinutes: z.number().int().positive().max(60 * 24 * 30),
        stopPolicy: z.enum(['hard_stop', 'informational']).optional(),
      })
      .strict(),
  })
  .strict()
  .superRefine((req, ctx) => {
    const seen = new Set<string>();
    req.references.pins.forEach((pin, i) => {
      const key = `${pin.service}\u0000${pin.artifactType}\u0000${pin.id}`;
      if (seen.has(key)) {
        ctx.addIssue({
          code: 'custom',
          path: ['references', 'pins', i],
          message: 'duplicate pin for the same service, artifactType and id',
        });
      }
      seen.add(key);
    });
  });

export type TriggerRequest = z.output<typeof TriggerRequestSchema>;
export type TriggerRequestInput = z.input<typeof TriggerRequestSchema>;

/** Deterministic JSON (sorted keys, undefined dropped) so equal requests hash equally. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(',')}}`;
}

export const hashTriggerRequest = (scenarioId: string, request: TriggerRequest) =>
  createHash('sha256').update(canonicalJson({ scenarioId, request })).digest('hex');
