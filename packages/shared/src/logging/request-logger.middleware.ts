import { randomUUID } from "node:crypto";
import { Logger } from "@nestjs/common";

interface HttpRequest {
  method?: string;
  originalUrl?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
  user?: { id?: string };
}

interface HttpResponse {
  statusCode: number;
  setHeader(name: string, value: string): void;
  on(event: "finish" | "close", listener: () => void): void;
  writableFinished?: boolean;
}

const REQUEST_ID_HEADER = "x-request-id";
const logger = new Logger("HTTP");

/**
 * Express-level middleware that logs one line per request when the response
 * completes. Unlike an interceptor it runs before guards, so requests rejected
 * by guards, pipes or the router (401/403/404) are logged too.
 * Register with `app.use(requestLogger)`.
 */
export function requestLogger(
  req: HttpRequest,
  res: HttpResponse,
  next: () => void,
): void {
  const startTime = performance.now();
  const incomingId = req.headers[REQUEST_ID_HEADER];
  const requestId =
    (Array.isArray(incomingId) ? incomingId[0] : incomingId) ?? randomUUID();
  res.setHeader(REQUEST_ID_HEADER, requestId);

  const method = req.method ?? "UNKNOWN";
  // Drop the query string: it can carry tokens or other secrets.
  const path = (req.originalUrl ?? req.url ?? "").split("?")[0];

  let logged = false;
  const logCompletion = () => {
    if (logged) return;
    logged = true;
    // `user` is populated by auth guards, so read it at completion time.
    const userId = req.user?.id ?? "anonymous";
    const aborted = res.writableFinished === false;
    const status = aborted ? "aborted" : res.statusCode;
    const message = `[${requestId}] ${method} ${path} ${status} ${Math.round(performance.now() - startTime)}ms user=${userId}`;
    if (!aborted && res.statusCode >= 500) logger.error(message);
    else if (aborted || res.statusCode >= 400) logger.warn(message);
    else logger.log(message);
  };

  res.on("finish", logCompletion);
  res.on("close", logCompletion);
  next();
}
