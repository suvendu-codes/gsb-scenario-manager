import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";

import { scenarioListStatesStyles as styles } from "./ScenarioListStates.styles";

const SKELETON_ROWS = 3;

/** Placeholder rows shown while the scenario list is loading. */
export function ScenarioListLoading(): React.JSX.Element {
  return (
    <div className={styles.skeletonList} role="status" aria-label="Loading scenarios">
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <div key={index} className={styles.skeletonRow} />
      ))}
    </div>
  );
}

/**
 * Message shown when there are no scenarios to list, with a link to create one.
 *
 * @param statusLabel - Lowercase status name when a status filter hides everything
 *   (for example `"completed"`), to show "No completed scenarios yet".
 */
export function ScenarioListEmpty({ statusLabel }: { statusLabel?: string }): React.JSX.Element {
  return (
    <div className={styles.message}>
      <p className={styles.messageTitle}>
        {statusLabel ? `No ${statusLabel} scenarios yet` : "No scenarios yet"}
      </p>
      <p className={styles.messageText}>Create a scenario to get started.</p>
      <Link href="/scenarios?create=1" className={buttonVariants({ size: "sm" })}>
        Create new scenario
      </Link>
    </div>
  );
}

/**
 * Message shown when the service itself is down (the health check failed too),
 * so the user knows it is not something they did.
 *
 * @param onRetry - Called when the user clicks "Try again".
 */
export function ScenarioListServiceDown({ onRetry }: { onRetry: () => void }): React.JSX.Element {
  return (
    <div className={styles.message} role="alert">
      <p className={styles.messageTitle}>Service unavailable</p>
      <p className={styles.messageText}>
        Scenario Manager can’t reach its service right now. Please try again in a few minutes.
      </p>
      <Button variant="ghost" size="sm" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

/**
 * Message shown when loading the list failed, with a retry button.
 *
 * @param message - The error message to show.
 * @param onRetry - Called when the user clicks "Try again".
 */
export function ScenarioListError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}): React.JSX.Element {
  return (
    <div className={styles.message} role="alert">
      <p className={styles.messageTitle}>Couldn’t load scenarios</p>
      <p className={styles.messageText}>{message}</p>
      <Button variant="ghost" size="sm" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
