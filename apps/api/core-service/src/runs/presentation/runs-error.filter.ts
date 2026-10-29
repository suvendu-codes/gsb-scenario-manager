import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { ZodValidationException } from 'nestjs-zod';
import { DomainError, type DomainErrorKind } from '../../common/domain/domain-error.js';
import { RunApiError } from '../domain/errors.js';

const KIND_STATUS: Record<DomainErrorKind, number> = {
  invalid: 400,
  not_found: 404,
  forbidden: 403,
  conflict: 409,
  unavailable: 503,
  bad_gateway: 502,
};

interface HttpRes {
  status(code: number): HttpRes;
  setHeader(name: string, value: string): void;
  getHeader(name: string): unknown;
  json(body: unknown): void;
}
interface HttpReq {
  headers: Record<string, string | string[] | undefined>;
}

export interface ErrorEnvelope {
  error: { code: string; message: string; details?: Record<string, unknown>; request_id: string | null };
}

/**
 * LLD error body for the run endpoints: { error: { code, message, details, request_id } }, plus
 * Retry-After where retrying makes sense. Request-body validation failures are 422 validation_failed.
 */
@Catch()
export class RunsErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(RunsErrorFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const res = http.getResponse<HttpRes>();
    const req = http.getRequest<HttpReq>();
    const requestIdHeader = res.getHeader('x-request-id') ?? req.headers['x-request-id'];
    const requestId = Array.isArray(requestIdHeader) ? String(requestIdHeader[0]) : requestIdHeader ? String(requestIdHeader) : null;

    const { status, body, retryAfter } = this.describe(exception);
    if (retryAfter) res.setHeader('Retry-After', String(retryAfter));
    res.status(status).json({ error: { ...body, request_id: requestId } } satisfies ErrorEnvelope);
  }

  private describe(exception: unknown): {
    status: number;
    body: Omit<ErrorEnvelope['error'], 'request_id'>;
    retryAfter?: number;
  } {
    if (exception instanceof RunApiError) {
      return {
        status: exception.status,
        body: { code: exception.code!, message: exception.message, ...(exception.details && { details: exception.details }) },
        retryAfter: exception.retryAfter,
      };
    }
    if (exception instanceof DomainError) {
      return {
        status: KIND_STATUS[exception.kind],
        body: {
          code: exception.code ?? exception.kind,
          message: exception.message,
          ...(exception.details && { details: exception.details }),
        },
      };
    }
    if (exception instanceof ZodValidationException) {
      const zodError = exception.getZodError() as { issues?: { path: PropertyKey[]; message: string }[] };
      return {
        status: 422,
        body: {
          code: 'validation_failed',
          message: 'The request is invalid',
          details: {
            errors: (zodError.issues ?? []).map((i) => ({
              path: i.path.map(String).join('.') || '(body)',
              reason: i.message,
            })),
          },
        },
      };
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      return {
        status,
        body: { code: status === 400 ? 'malformed_request' : `http_${status}`, message: exception.message },
      };
    }
    this.logger.error(
      `Unhandled trigger error: ${exception instanceof Error ? exception.message : String(exception)}`,
      exception instanceof Error ? exception.stack : undefined,
    );
    return { status: 500, body: { code: 'internal_error', message: 'Unexpected Scenario Manager error' } };
  }
}
