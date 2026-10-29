/**
 * Exponential backoff with full jitter: attempt 1 waits up to base, attempt n up to
 * base * 2^(n-1), capped at max. `random` is injectable for deterministic tests.
 */
export function backoffDelayMs(
  attempts: number,
  baseMs: number,
  maxMs: number,
  random: () => number = Math.random,
): number {
  const exponent = Math.max(0, Math.min(attempts - 1, 30));
  const ceiling = Math.min(maxMs, baseMs * 2 ** exponent);
  // Keep a floor of half the ceiling so retries never hammer the broker back-to-back.
  return Math.round(ceiling / 2 + random() * (ceiling / 2));
}

export type FailureDecision = { action: 'retry'; delayMs: number } | { action: 'dead' };

export function decideOnFailure(args: {
  retriable: boolean;
  attempts: number;
  maxAttempts: number;
  baseMs: number;
  maxMs: number;
  random?: () => number;
}): FailureDecision {
  const { retriable, attempts, maxAttempts, baseMs, maxMs, random } = args;
  if (!retriable) return { action: 'dead' };
  if (maxAttempts > 0 && attempts >= maxAttempts) return { action: 'dead' };
  return { action: 'retry', delayMs: backoffDelayMs(attempts, baseMs, maxMs, random) };
}

/** Bounded, single-line error text for `last_error` (no stack traces or payload data). */
export function describeError(error: unknown, max = 500): string {
  const name = error instanceof Error ? error.name : 'Error';
  const message = error instanceof Error ? error.message : String(error);
  const text = `${name}: ${message}`.replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
