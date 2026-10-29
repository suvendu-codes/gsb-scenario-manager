import { z } from "zod";

/** The values a problem's `params` can hold. */
export type ProblemParams = Record<string, string | number | boolean>;

/**
 * One thing wrong with a request or a value, in the shape the API reports it.
 *
 * - `code`: stable and machine-readable. Clients branch on it; it never changes with wording.
 * - `message`: an English fallback for people. Clients must never parse it.
 * - `params`: the values the message was built from (a station id, an hour count), so a client
 *   can build its own text, for example in another language.
 * - `path`: where the problem is, as a dot-notation path into the data (the same notation the
 *   config overrides use), when it belongs to one value.
 *
 * The envelope names no feature's concepts; each feature defines its own codes and params.
 */
export const problemSchema = z.object({
  code: z.string(),
  message: z.string(),
  params: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  path: z.string().optional(),
});

export type Problem = z.infer<typeof problemSchema>;

/**
 * The body of an error response: one problem that describes the failure as a whole, plus the
 * list of every problem found, so a client can show them all at once and point at each field.
 */
export const errorBodySchema = problemSchema.extend({
  problems: z.array(problemSchema).optional(),
});

export type ErrorBody = z.infer<typeof errorBodySchema>;

/** An error body read into one shape, with the request id when the server sent one. */
export type ParsedError = ErrorBody & { requestId?: string };

type Json = Record<string, unknown>;

const isRecord = (value: unknown): value is Json =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** The scalar entries of an object, as problem params; `skip` names keys to leave out. */
function scalars(source: Json, skip: string[] = []): ProblemParams | undefined {
  const params: ProblemParams = {};
  for (const [key, value] of Object.entries(source)) {
    if (skip.includes(key)) continue;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      params[key] = value;
    }
  }
  return Object.keys(params).length > 0 ? params : undefined;
}

/**
 * Reads the nested shape `{ error: { code, message, details?, request_id? } }`. Its `details`
 * can list problems as `errors: [{ path, reason }]` or `issues: [{ code, message? }]`; the other
 * scalar details become `params`. Anything that does not fit is left out, never thrown on.
 */
function fromNestedError(body: unknown): ParsedError | null {
  if (!isRecord(body) || !isRecord(body.error)) return null;
  const { code, message, details, request_id: requestId } = body.error;
  if (typeof code !== "string" || typeof message !== "string") return null;

  const info = isRecord(details) ? details : {};
  const problems: Problem[] = [];
  for (const item of Array.isArray(info.errors) ? info.errors : []) {
    if (!isRecord(item)) continue;
    const path = typeof item.path === "string" ? item.path : undefined;
    const reason = typeof item.reason === "string" ? item.reason : "invalid";
    const params = scalars(item, ["path", "reason"]);
    problems.push({
      code: reason,
      message: path ? `${path}: ${reason}` : reason,
      ...(params && { params }),
      ...(path && { path }),
    });
  }
  for (const item of Array.isArray(info.issues) ? info.issues : []) {
    if (!isRecord(item)) continue;
    const issueCode = typeof item.code === "string" ? item.code : "issue";
    const params = scalars(item, ["code", "message"]);
    problems.push({
      code: issueCode,
      message: typeof item.message === "string" ? item.message : issueCode,
      ...(params && { params }),
    });
  }

  const params = scalars(info, ["errors", "issues"]);
  return {
    code,
    message,
    ...(params && { params }),
    ...(problems.length > 0 && { problems }),
    ...(typeof requestId === "string" && { requestId }),
  };
}

/**
 * Reads an error response body. The API's error shape is not settled, so this accepts the
 * envelope used here (`{ code, message, params?, path?, problems? }`) and the nested
 * `{ error: { code, message, details, request_id } }`.
 *
 * @param body - The parsed JSON of a non-2xx response.
 * @returns The error body, or null if it follows neither shape.
 */
export function parseErrorBody(body: unknown): ParsedError | null {
  const envelope = errorBodySchema.safeParse(body);
  return envelope.success ? envelope.data : fromNestedError(body);
}

/**
 * A one-line English summary of several problems, for the `message` of an error that lists them:
 * the first problem's message, and how many more there are.
 *
 * @param problems - At least one problem.
 */
export function summarizeProblems(problems: Problem[]): string {
  const [first, ...rest] = problems;
  if (rest.length === 0) return first.message;
  return `${first.message} (and ${rest.length} more ${rest.length === 1 ? "problem" : "problems"})`;
}
