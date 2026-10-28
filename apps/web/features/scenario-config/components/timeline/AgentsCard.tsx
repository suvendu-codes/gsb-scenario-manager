import type { ReadyConfigEditor } from "../../panel";
import { availability } from "../../timeline/agent-lane";
import { TimelineBlock } from "./TimelineBlock";
import { TimelineCard } from "./TimelineCard";
import { TimelineLane, TimelineRuler } from "./TimelineLane";

type AgentsCardProps = {
  editor: ReadyConfigEditor;
  selected: boolean;
  onOpen: () => void;
};

/** The Agents card: bots available for the run, then the outage share (placement illustrative). */
export function AgentsCard({ editor, selected, onOpen }: AgentsCardProps): React.JSX.Element {
  const run = editor.runDurationHours;
  const lane = availability(editor.config.agent);

  return (
    <TimelineCard title="Agents" subtitle={`${lane.bots} bots`} selected={selected} onOpen={onOpen}>
      <TimelineRuler runHours={run} />
      <TimelineLane label="Availability" runHours={run}>
        <TimelineBlock
          tone="available"
          leftPct={0}
          widthPct={lane.availablePct}
          label="All available"
          detail={lane.fleet}
          title={`All available: ${lane.fleet}`}
          onOpen={onOpen}
        />
        {lane.outagePct > 0 && (
          <TimelineBlock
            tone="outage"
            leftPct={lane.availablePct}
            widthPct={lane.outagePct}
            label={lane.outagePct < 12 ? `${lane.outagePct}%` : `Bot outage (${lane.outagePct}%)`}
            title={`Bot outage: ${lane.outagePct}% of the run. Placement is illustrative.`}
            onOpen={onOpen}
          />
        )}
      </TimelineLane>
    </TimelineCard>
  );
}
