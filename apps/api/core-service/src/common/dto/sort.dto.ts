import { z } from 'zod';

export type SortDirection = 'asc' | 'desc';

export interface Sort<F extends string> {
  field: F;
  direction: SortDirection;
}

/** `?sort=name` is ascending, `?sort=-name` is descending. Unknown fields fall back. */
export function parseSort<F extends string>(
  raw: string | undefined,
  allowed: readonly F[],
  fallback: Sort<F>,
): Sort<F> {
  if (!raw) return fallback;
  const direction: SortDirection = raw.startsWith('-') ? 'desc' : 'asc';
  const field = raw.replace(/^-/, '');
  return (allowed as readonly string[]).includes(field)
    ? { field: field as F, direction }
    : fallback;
}

export const sortQuery = (fields: readonly [string, ...string[]]) =>
  z
    .string()
    .regex(new RegExp(`^-?(${fields.join('|')})$`), {
      error: `sort must be one of ${fields.join(', ')} (prefix with - for descending)`,
    })
    .optional()
    .meta({
      description: `Sort field; prefix with \`-\` for descending. Allowed: ${fields.join(', ')}`,
      example: '-updated_at',
    });
