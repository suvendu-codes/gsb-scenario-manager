/** drizzle-orm wraps driver errors in DrizzleQueryError; the pg error (with code/constraint) is the cause. */
export interface PgErrorInfo {
  code?: string;
  constraint?: string;
}

export function pgError(error: unknown): PgErrorInfo {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current && typeof current === 'object'; depth++) {
    const candidate = current as { code?: unknown; constraint?: unknown; cause?: unknown };
    if (typeof candidate.code === 'string') {
      return {
        code: candidate.code,
        constraint: typeof candidate.constraint === 'string' ? candidate.constraint : undefined,
      };
    }
    current = candidate.cause;
  }
  return {};
}

export const isUniqueViolation = (error: unknown, constraint?: string) => {
  const info = pgError(error);
  return info.code === '23505' && (constraint === undefined || info.constraint === constraint);
};
