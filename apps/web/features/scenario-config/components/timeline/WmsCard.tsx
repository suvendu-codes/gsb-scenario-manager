import type { ReadyConfigEditor } from "../../panel";
import { RUN_START_HOUR } from "../../timeline/geometry";
import { cutoffMarker, outboundProfile, releaseBlocks } from "../../timeline/wms-lane";
import { TimelineBlock } from "./TimelineBlock";
import { TimelineCard } from "./TimelineCard";
import { TimelineLane, TimelineRuler } from "./TimelineLane";
import { wmsCardStyles as styles } from "./WmsCard.styles";

type WmsCardProps = {
  editor: ReadyConfigEditor;
  /** The outbound dataset's lines per hour, if it has a profile. */
  outboundHourly: readonly number[] | undefined;
  selected: boolean;
  onOpen: () => void;
};

/**
 * The WMS (Order) card: how orders are released over the run (waves, or one streaming block,
 * with their order lines when the outbound dataset has a profile) and where the cutoff falls.
 */
export function WmsCard({
  editor,
  outboundHourly,
  selected,
  onOpen,
}: WmsCardProps): React.JSX.Element {
  const { wms } = editor.config;
  const run = editor.runDurationHours;
  const profile = outboundProfile(outboundHourly, wms);
  const blocks = releaseBlocks(wms, run, RUN_START_HOUR, profile);
  const cutoff = cutoffMarker(wms.cutoffHour, RUN_START_HOUR, run);

  return (
    <TimelineCard
      title="WMS (Order)"
      subtitle="Demand and release"
      selected={selected}
      onOpen={onOpen}
    >
      <TimelineRuler runHours={run} />
      <TimelineLane label="Release" runHours={run} height={58}>
        {blocks.map((block) => (
          <TimelineBlock
            key={block.label}
            tone="wave"
            leftPct={block.leftPct}
            widthPct={block.widthPct}
            label={block.label}
            detail={block.lines === null ? undefined : block.lines.toLocaleString("en-US")}
            title={
              block.lines === null
                ? block.label
                : `${block.label}: ${block.lines.toLocaleString("en-US")} order lines`
            }
            onOpen={onOpen}
          />
        ))}
        {cutoff.where === "inside" ? (
          <>
            <span className={styles.cutoff} style={{ left: `${cutoff.pct}%` }} aria-hidden="true" />
            <span
              className={styles.cutoffLabel}
              style={
                cutoff.pct > 72
                  ? { right: `calc(${100 - cutoff.pct}% + 10px)` }
                  : { left: `calc(${cutoff.pct}% + 10px)` }
              }
            >
              {cutoff.label}
            </span>
          </>
        ) : (
          <span className={styles.cutoffEdge}>{cutoff.label}</span>
        )}
      </TimelineLane>
    </TimelineCard>
  );
}
