import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  //context -> contains request and response objects
  //control -> route handler exectes

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{
      method?: string;
      url?: string;
      get?: (name: string) => string | undefined;
      user?: { id?: string };
    }>();
    const { method, url } = request;
    const userAgent = request.get?.("user-agent") || "unknown";

    const userId = request.user?.id || "unauthenticated";

    this.logger.log(`
        [${method} ${url} - User: ${userId} - User-Agent ${userAgent}]
            `);
    const startTime = Date.now();
    // tap operator allows us to perform side effects
    return next.handle().pipe(
      tap({
        next: (data) => {
          const endTime = Date.now();
          const duration = endTime - startTime;

          this.logger.log(`
                           [${method} ${url} - ${duration}ms - Response size - ${JSON.stringify(data)?.length || 0} bytes] 
                            `);
        },
        error: (error: { message?: string }) => {
          const endTime = Date.now();
          const duration = endTime - startTime;
          this.logger.log(`
                            [${method} ${url} - ${duration}ms - Error ${error.message}] 
                             `);
        },
      }),
    );
  }
}
