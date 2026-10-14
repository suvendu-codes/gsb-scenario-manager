"use client";

import Link from "next/link";
import { useEffect } from "react";

import { PageMessage } from "@/components/layout/PageMessage";
import { Button, buttonVariants } from "@/components/ui/button";

/**
 * Fallback for unexpected errors while rendering a page. Shown inside the app
 * layout (the top bar stays), with a button that retries rendering the page.
 *
 * @param error - The error that was thrown.
 * @param retry - Tries to render the page again.
 */
export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}): React.JSX.Element {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PageMessage
      title="Something went wrong"
      description="An unexpected error stopped this page from loading. You can try again, or go back to the scenario list."
    >
      <Button size="sm" onClick={() => retry()}>
        Try again
      </Button>
      <Link href="/scenarios" className={buttonVariants({ variant: "ghost", size: "sm" })}>
        Go to scenarios
      </Link>
    </PageMessage>
  );
}
