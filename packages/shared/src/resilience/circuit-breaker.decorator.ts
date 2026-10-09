import OpossumCircuitBreaker from "opossum";

const DEFAULT_OPTIONS: OpossumCircuitBreaker.Options = {
  timeout: 3_000,
  errorThresholdPercentage: 50,
  resetTimeout: 10_000,
  volumeThreshold: 5,
};

const breakers = new Map<string, OpossumCircuitBreaker>();

export function CircuitBreaker(
  options: OpossumCircuitBreaker.Options = {},
): MethodDecorator {
  return (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    const originalMethod = descriptor.value as (
      ...args: unknown[]
    ) => unknown;
    const name = `${target.constructor.name}.${String(propertyKey)}`;

    descriptor.value = function (...args: unknown[]) {
      let breaker = breakers.get(name);
      if (!breaker) {
        breaker = new OpossumCircuitBreaker(
          (call: () => unknown) => Promise.resolve(call()),
          { name, ...DEFAULT_OPTIONS, ...options },
        );
        breakers.set(name, breaker);
      }

      return breaker.fire(() => originalMethod.apply(this, args));
    };

    return descriptor;
  };
}
