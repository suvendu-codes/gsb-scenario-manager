import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import OpossumCircuitBreaker from "opossum";
import { from, lastValueFrom, type Observable } from "rxjs";

const DEFAULT_OPTIONS: OpossumCircuitBreaker.Options = {
  timeout: 3_000,
  errorThresholdPercentage: 50,
  resetTimeout: 10_000,
  volumeThreshold: 5,
};

@Injectable()
export class CircuitBreakerInterceptor implements NestInterceptor {
  private readonly breakers = new Map<string, OpossumCircuitBreaker>();

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const name = `${context.getClass().name}.${context.getHandler().name}`;
    return from(this.getBreaker(name).fire(() => lastValueFrom(next.handle())));
  }

  private getBreaker(name: string): OpossumCircuitBreaker {
    let breaker = this.breakers.get(name);
    if (!breaker) {
      breaker = new OpossumCircuitBreaker(
        (call: () => Promise<unknown>) => call(),
        { name, ...DEFAULT_OPTIONS },
      );
      this.breakers.set(name, breaker);
    }
    return breaker;
  }
}
