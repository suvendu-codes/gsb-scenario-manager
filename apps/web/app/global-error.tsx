"use client";

import { useEffect } from "react";

import { globalErrorStyles as styles } from "./global-error.styles";

/**
 * Last-resort fallback for errors the normal error page cannot catch, such as an
 * error in the root layout. It replaces the whole page, so it brings its own
 * `<html>` and `<body>` and uses inline styles.
 *
 * @param error - The error that was thrown.
 * @param retry - Tries to render the app again.
 */
export default function GlobalError({
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
    <html lang="en">
      <body style={styles.body}>
        <title>Something went wrong</title>
        <h1 style={styles.title}>Something went wrong</h1>
        <p style={styles.description}>
          Scenario Manager hit an unexpected error and couldn’t load. Please try again.
        </p>
        <button type="button" style={styles.button} onClick={() => retry()}>
          Try again
        </button>
      </body>
    </html>
  );
}
