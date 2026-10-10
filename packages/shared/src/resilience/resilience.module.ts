import { Module } from "@nestjs/common";
import { CircuitBreakerInterceptor } from "./circuit-breaker.interceptor";
import { RetryInterceptor } from "./retry.interceptor";

@Module({
  providers: [CircuitBreakerInterceptor, RetryInterceptor],
  exports: [CircuitBreakerInterceptor, RetryInterceptor],
})
export class ResilienceModule {}
