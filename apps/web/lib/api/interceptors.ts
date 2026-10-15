import type { ApiError } from "./errors";

/** What a request interceptor can see and change before the request is sent. */
export type RequestContext = {
  method: string;
  path: string;
  headers: Headers;
};

/** Runs before every request. Change `context.headers` to add or edit headers. */
export type RequestInterceptor = (context: RequestContext) => void | Promise<void>;

/** Runs when a request has failed with an `ApiError`, before the error reaches the caller. */
export type ErrorInterceptor = (
  error: ApiError,
  context: Pick<RequestContext, "method" | "path">,
) => void | Promise<void>;

type TokenProvider = () => string | null | undefined;

let tokenProvider: TokenProvider = () => null;

/**
 * Tells the API client where to get the access token from.
 * Until this is called there is no token, so no `Authorization` header is sent.
 *
 * @param provider - Returns the current token, or nothing when signed out.
 */
export function setTokenProvider(provider: TokenProvider): void {
  tokenProvider = provider;
}

/** Adds `Authorization: Bearer <token>` when a token is available. */
const authInterceptor: RequestInterceptor = ({ headers }) => {
  const token = tokenProvider();
  if (token) headers.set("Authorization", `Bearer ${token}`);
};

type StatusHandler = (error: ApiError) => void;

let unauthorizedHandler: StatusHandler = (error) => console.error("Unauthorized (401):", error);
let forbiddenHandler: StatusHandler = (error) => console.error("Forbidden (403):", error);

/**
 * Sets what happens when the API answers 401 (not signed in or session expired).
 * For now the default only logs the error; sign-out and redirect belong here once auth exists.
 *
 * @param handler - Called with the error.
 */
export function setUnauthorizedHandler(handler: StatusHandler): void {
  unauthorizedHandler = handler;
}

/**
 * Sets what happens when the API answers 403 (signed in but not allowed).
 * For now the default only logs the error.
 *
 * @param handler - Called with the error.
 */
export function setForbiddenHandler(handler: StatusHandler): void {
  forbiddenHandler = handler;
}

/** Sends 401 and 403 responses to their handlers. */
const statusInterceptor: ErrorInterceptor = (error) => {
  if (error.status === 401) unauthorizedHandler(error);
  if (error.status === 403) forbiddenHandler(error);
};

/**
 * The interceptors the client runs, in order. Add your own with `push`,
 * or edit this list, to change what happens around every request.
 */
export const requestInterceptors: RequestInterceptor[] = [authInterceptor];
export const errorInterceptors: ErrorInterceptor[] = [statusInterceptor];
