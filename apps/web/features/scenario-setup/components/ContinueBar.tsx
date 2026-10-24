import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { continueBarStyles as styles } from "./ContinueBar.styles";

/**
 * The "Continue to scenario →" link shown once the datasets are validated. It opens the
 * scenario's config screen.
 *
 * @param scenarioId - The id of the scenario being set up.
 */
export function ContinueBar({ scenarioId }: { scenarioId: string }): React.JSX.Element {
  return (
    <div className={styles.root}>
      <Link
        href={`/scenarios/${encodeURIComponent(scenarioId)}/config`}
        className={cn(buttonVariants(), styles.button)}
      >
        Continue to scenario →
      </Link>
    </div>
  );
}
