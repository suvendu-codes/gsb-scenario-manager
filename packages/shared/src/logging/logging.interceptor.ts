// import {
//   CallHandler,
//   ExecutionContext,
//   Injectable,
//   Logger,
//   NestInterceptor,
// } from "@nestjs/common";
// import { tap, type Observable } from "rxjs";

// @Injectable()
// export class LoggingInterceptor implements NestInterceptor {
//   private readonly logger = new Logger(LoggingInterceptor.name);

//   intercept(
//     context: ExecutionContext,
//     next: CallHandler,
//   ): Observable<unknown> {
//     const now = Date.now();
//     const { method, url } = this.requestMeta(context);

//     return next.handle().pipe(
//       tap(() => {
//         this.logger.log(`${method} ${url} ${Date.now() - now}ms`);
//       }),
//     );
//   }

//   private requestMeta(context: ExecutionContext): {
//     method: string;
//     url: string;
//   } {
//     if (context.getType() === "http") {
//       const req = context.switchToHttp().getRequest<{
//         method?: string;
//         url?: string;
//       }>();
//       return { method: req.method ?? "HTTP", url: req.url ?? "" };
//     }

//     return {
//       method: context.getType(),
//       url: `${context.getClass().name}.${context.getHandler().name}`,
//     };
//   }
// }

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import logger from "./logger";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
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

    logger.log(`
        [${method} ${url} - User: ${userId} - User-Agent ${userAgent}]
            `);
    const startTime = Date.now();
    // tap operator allows us to perform side effects
    return next.handle().pipe(
      tap({
        next: (data) => {
          const endTime = Date.now();
          const duration = endTime - startTime;

          logger.log(`
                           [${method} ${url} - ${duration}ms - Response size - ${JSON.stringify(data)?.length || 0} bytes] 
                            `);
        },
        error: (error: { message?: string }) => {
          const endTime = Date.now();
          const duration = endTime - startTime;
          logger.log(`
                            [${method} ${url} - ${duration}ms - Error ${error.message}] 
                             `);
        },
      }),
    );
  }
}
