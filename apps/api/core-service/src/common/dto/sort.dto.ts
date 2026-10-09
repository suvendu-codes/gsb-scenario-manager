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

export const sortPattern = (fields: readonly string[]) =>
  new RegExp(`^-?(${fields.join('|')})$`);
