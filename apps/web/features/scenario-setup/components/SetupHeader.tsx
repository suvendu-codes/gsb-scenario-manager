import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { setupHeaderStyles as styles } from "./SetupHeader.styles";

/** The "Configure scenario" heading with a back arrow to the scenario list, and a one-line intro. */
export function SetupHeader(): React.JSX.Element {
  return (
    <>
      <div className={styles.row}>
        <Link href="/scenarios" className={styles.back} aria-label="Back to scenarios">
          <ChevronLeft className={styles.backIcon} aria-hidden="true" />
        </Link>
        <h2 className={styles.title}>Configure scenario</h2>
      </div>
      <p className={styles.subtitle}>
        Add the datasets this run will draw on, then validate them against the site map before
        configuring the timeline.
      </p>
    </>
  );
}
