import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  NestInterceptor,
  Optional,
} from "@nestjs/common";
import {
  catchError,
  from,
  retry,
  switchMap,
  throwError,
  timer,
  type Observable,
} from "rxjs";

export const DLQ_PUBLISHER = "DLQ_PUBLISHER";

export interface DlqPublisher {
  publish(payload: {
    handler: string;
    error: string;
    data: unknown;
  }): Promise<void> | void;
}

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 100;

@Injectable()
export class RetryInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RetryInterceptor.name);

  constructor(
    @Optional()
    @Inject(DLQ_PUBLISHER)
    private readonly dlq?: DlqPublisher,
  ) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const handler = `${context.getClass().name}.${context.getHandler().name}`;

    return next.handle().pipe(
      retry({
        count: MAX_RETRIES,
        delay: (_error, retryIndex) =>
          timer(BASE_DELAY_MS * 2 ** (retryIndex - 1)),
      }),
      catchError((error: unknown) => {
        const err = error instanceof Error ? error : new Error(String(error));
        return from(this.publishDlq(handler, err, this.getData(context))).pipe(
          switchMap(() => throwError(() => err)),
        );
      }),
    );
  }

  private async publishDlq(
    handler: string,
    error: Error,
    data: unknown,
  ): Promise<void> {
    if (!this.dlq) {
      return;
    }

    try {
      await this.dlq.publish({ handler, error: error.message, data });
    } catch (dlqError) {
      const nested =
        dlqError instanceof Error ? dlqError : new Error(String(dlqError));
      this.logger.error(`DLQ publish failed: ${nested.message}`, nested.stack);
    }
  }

  private getData(context: ExecutionContext): unknown {
    if (context.getType() === "http") {
      return context.switchToHttp().getRequest<{ body?: unknown }>().body;
    }
    if (context.getType() === "rpc") {
      return context.switchToRpc().getData();
    }
    return undefined;
  }
}
