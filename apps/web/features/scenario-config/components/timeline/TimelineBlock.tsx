import { cn } from "@/lib/utils";

import { timelineBlockStyles as styles } from "./TimelineBlock.styles";

/** The colours a block can have on a lane. */
export type BlockTone = "wave" | "available" | "outage" | "pick" | "put" | "audit" | "mixed";

type TimelineBlockProps = {
  tone: BlockTone;
  leftPct: number;
  widthPct: number;
  /** The main text, such as "Wave 1". */
  label: string;
  /** A number at the right, such as the order lines. */
  detail?: string;
  /** What the block is, for tooltips and screen readers. */
  title: string;
  /** Opens the block's settings; without it the block is not a button. */
  onOpen?: () => void;
};

/** Below this share of the run, a block drops its padding so a short label still fits. */
const COMPACT_BELOW_PCT = 8;

/** A block on a timeline lane, placed by percentage of the run. */
export function TimelineBlock({
  tone,
  leftPct,
  widthPct,
  label,
  detail,
  title,
  onOpen,
}: TimelineBlockProps): React.JSX.Element {
  const style = { left: `calc(${leftPct}% + 1px)`, width: `calc(${widthPct}% - 2px)` };
  const compact = widthPct < COMPACT_BELOW_PCT && styles.compact;
  const body = (
    <>
      <span className={styles.label}>{label}</span>
      {detail && <span className={styles.detail}>{detail}</span>}
    </>
  );
  return onOpen ? (
    <button
      type="button"
      className={cn(styles.root, styles[tone], styles.button, compact)}
      style={style}
      title={title}
      aria-label={title}
      onClick={onOpen}
    >
      {body}
    </button>
  ) : (
    <div className={cn(styles.root, styles[tone], compact)} style={style} title={title}>
      {body}
    </div>
  );
}
