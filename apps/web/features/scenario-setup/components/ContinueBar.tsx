"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

import { continueBarStyles as styles } from "./ContinueBar.styles";

const NOTICE_MS = 3500;

/**
 * The "Continue to scenario →" button shown once the datasets are validated. The scenario
 * manager screen it leads to is not built yet, so clicking it shows a short notice instead.
 */
export function ContinueBar(): React.JSX.Element {
  const [showNotice, setShowNotice] = useState(false);

  useEffect(() => {
    if (!showNotice) return;
    const timer = setTimeout(() => setShowNotice(false), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [showNotice]);

  return (
    <div className={styles.root}>
      <Button className={styles.button} onClick={() => setShowNotice(true)}>
        Continue to scenario →
      </Button>
      {showNotice && (
        <div className={styles.notice} role="status">
          The scenario manager screen is coming in the next ticket.
        </div>
      )}
    </div>
  );
}
