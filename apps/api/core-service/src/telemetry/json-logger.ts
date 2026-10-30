import type { LoggerService } from '@nestjs/common';
import { trace } from '@opentelemetry/api';

type Level = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'verbose';

const SEVERITY: Record<Level, number> = {
  fatal: 60,
  error: 50,
  warn: 40,
  info: 30,
  debug: 20,
  verbose: 10,
};

/** Nest calls its info level `log`; it is emitted as `info`. LOG_LEVEL accepts either name. */
const LEVEL_ALIASES: Record<string, Level> = { log: 'info' };

type Write = (line: string) => void;

/**
 * Nest LoggerService that writes one JSON object per line to stdout/stderr.
 *
 * The cluster's OTel collector tails container output, so structured JSON becomes
 * searchable attributes in ClickStack. `trace_id` / `span_id` are added when a span is
 * active, which lets a log line be linked to its trace.
 *
 * Minimum level comes from LOG_LEVEL (fatal|error|warn|info|debug|verbose), default `info`.
 * Every line carries `service`, taken from OTEL_SERVICE_NAME.
 */
export class JsonLogger implements LoggerService {
  private readonly minSeverity: number;
  private readonly service: string | undefined;

  constructor(
    private readonly options: {
      level?: string;
      service?: string;
      stdout?: Write;
      stderr?: Write;
      now?: () => Date;
    } = {},
  ) {
    const raw = (options.level ?? process.env.LOG_LEVEL ?? 'info').toLowerCase();
    const level = LEVEL_ALIASES[raw] ?? (raw as Level);
    this.minSeverity = SEVERITY[level] ?? SEVERITY.info;
    this.service = options.service ?? process.env.OTEL_SERVICE_NAME;
  }

  log(message: unknown, ...optionalParams: unknown[]): void {
    this.write('info', message, optionalParams);
  }

  error(message: unknown, ...optionalParams: unknown[]): void {
    this.write('error', message, optionalParams);
  }

  warn(message: unknown, ...optionalParams: unknown[]): void {
    this.write('warn', message, optionalParams);
  }

  debug(message: unknown, ...optionalParams: unknown[]): void {
    this.write('debug', message, optionalParams);
  }

  verbose(message: unknown, ...optionalParams: unknown[]): void {
    this.write('verbose', message, optionalParams);
  }

  fatal(message: unknown, ...optionalParams: unknown[]): void {
    this.write('fatal', message, optionalParams);
  }

  private write(level: Level, message: unknown, params: unknown[]): void {
    if (SEVERITY[level] < this.minSeverity) return;

    // Nest convention: the last string param is the context; for error()/fatal() the
    // one before it may be a stack trace.
    const rest = [...params];
    let context: string | undefined;
    if (typeof rest[rest.length - 1] === 'string') context = rest.pop() as string;
    let stack: string | undefined;
    if ((level === 'error' || level === 'fatal') && typeof rest[0] === 'string') {
      stack = rest.shift() as string;
    }

    const entry: Record<string, unknown> = {
      timestamp: (this.options.now?.() ?? new Date()).toISOString(),
      level,
    };
    if (this.service) entry.service = this.service;
    if (context) entry.context = context;

    if (message instanceof Error) {
      entry.message = message.message;
      entry.stack = message.stack;
    } else if (message !== null && typeof message === 'object') {
      // Structured logs such as { event: 'worker_ready' } become top-level fields.
      const { message: nested, ...fields } = message as Record<string, unknown>;
      if (nested !== undefined) entry.message = nested;
      Object.assign(entry, fields);
    } else {
      entry.message = message;
    }
    if (stack) entry.stack = stack;

    const spanContext = trace.getActiveSpan()?.spanContext();
    if (spanContext) {
      entry.trace_id = spanContext.traceId;
      entry.span_id = spanContext.spanId;
    }

    const out =
      level === 'error' || level === 'fatal'
        ? (this.options.stderr ?? ((l) => process.stderr.write(l)))
        : (this.options.stdout ?? ((l) => process.stdout.write(l)));
    out(`${JSON.stringify(entry)}\n`);
  }
}
