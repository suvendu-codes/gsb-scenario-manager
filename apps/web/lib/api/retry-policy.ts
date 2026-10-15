import { ApiError } from "./errors";

/**
 * One retry rule. A request matches a rule when its method and path match
 * (an omitted field matches anything). The first matching rule wins.
 */
export type RetryRule = {
  /** HTTP methods this rule applies to, for example `["GET"]`. */
  methods?: string[];
  /** Matched against the request path, for example `/^\/scenarios$/`. */
  path?: RegExp;
  /**
   * HTTP statuses to retry. Defaults to every 5xx. Network errors and timeouts are
   * always retried when `retries` is above 0. Listing a 4xx status here (for example
   * 429) is the only way to retry a 4xx.
   */
  statuses?: number[];
  /** How many times to retry after the first attempt. `0` turns retrying off. */
  retries: number;
  /** Wait before the first retry; it doubles for each further retry. Defaults to 1000. */
  backoffMs?: number;
};

/** Retry settings a single call can pass to `request` to override the matching rule. */
export type RetryOptions = Partial<Pick<RetryRule, "retries" | "statuses" | "backoffMs">>;

/** Used when no rule matches. Applies to reads (GET, HEAD) only, so writes are never repeated by accident. */
const DEFAULT_RULE: RetryRule = { methods: ["GET", "HEAD"], retries: 2, backoffMs: 1000 };

/**
 * Per-API retry rules, checked in order before the default.
 * Add a rule here to change retrying for one endpoint, method or status code.
 * Example: `{ methods: ["GET"], path: /^\/scenarios$/, statuses: [503, 504], retries: 3 }`.
 */
export const retryRules: RetryRule[] = [];

/** What `request` needs to decide whether, and when, to try again. */
export type RetryPlan = {
  retries: number;
  /** True if this error is one the plan retries. */
  shouldRetry: (error: ApiError) => boolean;
  /** Milliseconds to wait before retry number `attempt` (1 for the first retry). */
  delayMs: (attempt: number) => number;
};

function matchesRule(rule: RetryRule, method: string, path: string): boolean {
  return (!rule.methods || rule.methods.includes(method)) && (!rule.path || rule.path.test(path));
}

/**
 * Works out the retry plan for one request: the first matching rule (or the
 * default for reads), then any overrides from the call itself.
 * 4xx responses are never retried unless their status is listed in `statuses`.
 *
 * @param method - Upper-case HTTP method.
 * @param path - Request path under the API base URL.
 * @param override - Settings from the call that win over the rule.
 */
export function getRetryPlan(method: string, path: string, override?: RetryOptions): RetryPlan {
  const rule = retryRules.find((r) => matchesRule(r, method, path));
  const base: RetryRule =
    rule ?? (matchesRule(DEFAULT_RULE, method, path) ? DEFAULT_RULE : { retries: 0 });

  const retries = override?.retries ?? base.retries;
  const statuses = override?.statuses ?? base.statuses;
  const backoffMs = override?.backoffMs ?? base.backoffMs ?? 1000;

  return {
    retries,
    shouldRetry: (error) => {
      if (error.kind === "network" || error.kind === "timeout") return true;
      if (error.kind !== "http") return false;
      return statuses ? statuses.includes(error.status) : error.status >= 500;
    },
    delayMs: (attempt) => backoffMs * 2 ** (attempt - 1),
  };
}

/** Resolves after `ms` milliseconds. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
