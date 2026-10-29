import { AlertTriangle, Info } from "lucide-react";

import { cn } from "@/lib/utils";

import type { RunSnapshot } from "../live/types";
import { attentionBarStyles as styles } from "./AttentionBar.styles";

/** The line at the top of the run: what needs attention, or that nothing does, and the log. */
export function AttentionBar({
  attention,
  onOpenLog,
}: {
  attention: RunSnapshot["attention"];
  onOpenLog: () => void;
}): React.JSX.Element {
  const warn = attention?.severity === "warning";
  const Icon = warn ? AlertTriangle : Info;
  return (
    <div className={cn(styles.root, warn && styles.warn)} role={warn ? "alert" : "status"}>
      <Icon className={styles.icon} aria-hidden="true" />
      <p className={styles.text}>{attention?.text ?? "Nothing needs your attention"}</p>
      <button type="button" className={styles.log} onClick={onOpenLog}>
        Event log
      </button>
    </div>
  );
}
