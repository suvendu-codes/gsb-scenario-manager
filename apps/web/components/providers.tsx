"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Client-side providers for the whole app. Currently TanStack Query.
 * The QueryClient is created once per browser session via `useState`.
 *
 * @param children - The app tree to wrap.
 */
export function Providers({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [queryClient] = useState(() => new QueryClient());

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
