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

/**
 * Reads an error response body.
 *
 * @param body - The parsed JSON of a non-2xx response.
 * @returns The error body, or null if it does not follow the envelope.
 */
export function parseErrorBody(body: unknown): ErrorBody | null {
  const parsed = errorBodySchema.safeParse(body);
  return parsed.success ? parsed.data : null;
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
