"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Client-side providers for the whole app. Currently TanStack Query.
 * The QueryClient is created once per browser session via `useState`.
 *
 * Retrying is turned off here on purpose: the API client already retries
 * network errors, timeouts and 5xx on reads (see `lib/api/retry-policy.ts`),
 * and never retries 4xx or writes. Retrying in both places would multiply attempts.
 *
 * @param children - The app tree to wrap.
 */
export function Providers({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
