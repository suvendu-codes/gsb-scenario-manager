import type { ClassProvider, ExistingProvider, FactoryProvider, ValueProvider } from '@nestjs/common';

/** A typed adapter binding; the owning module supplies its stable injection token. */
export type AdapterProvider<T> =
  | Omit<ClassProvider<T>, 'provide'>
  | Omit<ValueProvider<T>, 'provide'>
  | Omit<FactoryProvider<T>, 'provide'>
  | Omit<ExistingProvider<T>, 'provide'>;
