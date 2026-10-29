import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

import { timelineCardStyles as styles } from "./TimelineCard.styles";

type TimelineCardProps = {
  title: string;
  /** A short line under the title, such as "52 bots". */
  subtitle: string;
  /** True while the card's settings are open in the panel. */
  selected: boolean;
  /** Opens the card's settings in the panel. */
  onOpen: () => void;
  /** Controls shown at the right of the header. */
  actions?: React.ReactNode;
  children: React.ReactNode;
};

/**
 * One card of the timeline, such as WMS (Order) or Agents: a header that opens its settings,
 * and its lanes. It is outlined while its settings are open.
 */
export function TimelineCard({
  title,
  subtitle,
  selected,
  onOpen,
  actions,
  children,
}: TimelineCardProps): React.JSX.Element {
  return (
    <section className={cn(styles.root, selected && styles.selected)} aria-label={title}>
      <div className={styles.head}>
        <button
          type="button"
          className={styles.titleButton}
          aria-label={`Open ${title} settings`}
          aria-pressed={selected}
          onClick={onOpen}
        >
          <span className={styles.title}>
            {title}
            <ChevronRight className={styles.chevron} aria-hidden="true" />
          </span>
          <span className={styles.subtitle}>{subtitle}</span>
        </button>
        {actions}
      </div>
      {children}
    </section>
  );
}
