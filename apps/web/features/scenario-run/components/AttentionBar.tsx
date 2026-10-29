import { AlertTriangle, Info } from "lucide-react";

import { cn } from "@/lib/utils";

import { attentionBarStyles as styles } from "./AttentionBar.styles";

/** The line at the top of the run: what needs attention, or that nothing does, and the log. */
export function AttentionBar({
  message,
  onOpenLog,
}: {
  message: string | null;
  onOpenLog: () => void;
}): React.JSX.Element {
  const warn = message !== null && !message.startsWith("Warming up");
  const Icon = warn ? AlertTriangle : Info;
  return (
    <div className={cn(styles.root, warn && styles.warn)} role={warn ? "alert" : "status"}>
      <Icon className={styles.icon} aria-hidden="true" />
      <p className={styles.text}>{message ?? "Nothing needs your attention"}</p>
      <button type="button" className={styles.log} onClick={onOpenLog}>
        Event log
      </button>
    </div>
  );
}
