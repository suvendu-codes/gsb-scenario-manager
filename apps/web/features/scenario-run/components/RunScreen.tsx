"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { PageMessage } from "@/components/layout/PageMessage";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMapStations, useScenarioConfig } from "@/features/scenario-config/hooks";
import { useProjectMaps, useProjects } from "@/features/scenarios/hooks";
import { useScenarioDetail } from "@/features/scenario-setup/hooks";
import { cn } from "@/lib/utils";

import { formatHM, runEngine } from "../live/engine";
import { runInputsFrom } from "../live/inputs";
import { addChange, controlAt, pause, resume, stop } from "../live/session";
import { useNow, useRunSession } from "../live/store";
import type { RunInputs } from "../live/types";
import { AttentionBar } from "./AttentionBar";
import { EventLog } from "./EventLog";
import { KpiGrid } from "./KpiGrid";
import { LivePanel } from "./LivePanel";
import { RunHeader } from "./RunHeader";
import { RunLoading } from "./RunLoading";
import { RunTimeline } from "./RunTimeline";
import { runScreenStyles as styles } from "./RunScreen.styles";
import { StationsTable } from "./StationsTable";

/** The live run once its inputs are known: the clock, the engine's snapshot, and the controls. */
function LiveRun({ inputs, context }: { inputs: RunInputs; context: string }): React.JSX.Element {
  const [session, update, start] = useRunSession(inputs.scenarioId);
  const now = useNow(session !== null);
  const [view, setView] = useState<"timeline" | "stations">("timeline");
  const [logOpen, setLogOpen] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const snapshot = useMemo(
    () => (session ? runEngine.snapshot(inputs, controlAt(session, inputs.runHours, now)) : null),
    [inputs, session, now],
  );

  if (!session || !snapshot) {
    return (
      <RunLoading
        scenarioName={inputs.scenarioName}
        stations={inputs.stations.length}
        bots={inputs.bots}
        onDone={start}
      />
    );
  }

  const live = snapshot.phase !== "completed" && snapshot.phase !== "stopped";
  const run = inputs.runHours;
  const ended = !live;

  return (
    <div className={styles.root}>
      <RunHeader
        scenarioId={inputs.scenarioId}
        scenarioName={inputs.scenarioName}
        context={context}
        snapshot={snapshot}
        onPause={() => update((s) => pause(s, Date.now()))}
        onResume={() => update((s) => resume(s, Date.now()))}
        onStop={() => setConfirmStop(true)}
      />
      <div className={cn(styles.body, ended && styles.bodyEnded)}>
        <main className={styles.main}>
          {ended ? (
            <div className={styles.complete}>
              <div>
                <h2 className={styles.completeTitle}>
                  {snapshot.phase === "completed" ? "Run complete" : "Run stopped"}
                </h2>
                <p className={styles.completeDetail}>
                  {formatHM(snapshot.nowH)} · {snapshot.stations.filter((s) => !s.turnedOff).length}{" "}
                  of {snapshot.stations.length} stations · {snapshot.bots.total} bots
                </p>
              </div>
              <button type="button" className={styles.secondary} onClick={() => setLogOpen(true)}>
                Event log
              </button>
            </div>
          ) : (
            <AttentionBar attention={snapshot.attention} onOpenLog={() => setLogOpen(true)} />
          )}
          <KpiGrid kpis={snapshot.kpis} windowLabel={ended ? "Whole run" : "Over last 30m"} />
          <div className={styles.tabs} role="tablist" aria-label="Run views">
            {(["timeline", "stations"] as const).map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={view === id}
                className={styles.tab}
                onClick={() => setView(id)}
              >
                {id === "timeline" ? "Timeline" : "Stations"}
              </button>
            ))}
          </div>
          {view === "timeline" ? (
            <RunTimeline
              inputs={inputs}
              snapshot={snapshot}
              changes={session.changes}
              onOpenStation={(id) => setExpanded(id)}
            />
          ) : (
            <StationsTable stations={snapshot.stations} />
          )}
        </main>
        {!ended && (
          <LivePanel
            bots={snapshot.bots}
            stations={snapshot.stations}
            live={live}
            warmingUp={snapshot.phase === "warming-up"}
            expanded={expanded}
            onExpand={setExpanded}
            onToggleStation={(stationId, on) =>
              update((s) => addChange(s, { kind: "station", stationId, on }, run, Date.now()))
            }
            onSetBots={(bots) =>
              update((s) => addChange(s, { kind: "bots", bots }, run, Date.now()))
            }
          />
        )}
      </div>
      <EventLog
        events={snapshot.events}
        nowH={snapshot.nowH}
        open={logOpen}
        onOpenChange={setLogOpen}
      />
      <Dialog open={confirmStop} onOpenChange={setConfirmStop}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stop this run?</DialogTitle>
            <DialogDescription>
              It stops at {formatHM(snapshot.nowH)} of {formatHM(run)} and can’t be resumed. Results
              so far are kept.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className={styles.dialogActions}>
            <Button variant="ghost" size="sm" onClick={() => setConfirmStop(false)}>
              Keep running
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                update((s) => stop(s, run, Date.now()));
                setConfirmStop(false);
              }}
            >
              Stop run
            </Button>
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * The live emulation screen of a scenario (`/scenarios/{id}/run`). Entirely mocked: the run is
 * played in the browser from the scenario's config by the run engine (`live/engine.ts`). The
 * first visit after "Run emulation" shows the start-up screen, then the run.
 *
 * @param scenarioId - The scenario.
 */
export function RunScreen({ scenarioId }: { scenarioId: string }): React.JSX.Element {
  const detail = useScenarioDetail(scenarioId);
  const config = useScenarioConfig(scenarioId);
  const scenario = detail.data;
  const stations = useMapStations({
    projectId: scenario?.projectId ?? "",
    mapId: scenario?.mapId ?? "",
  });
  const projects = useProjects();
  const maps = useProjectMaps(scenario?.projectId ?? "");

  const inputs = useMemo(
    () =>
      scenario && config.data
        ? runInputsFrom(scenario, config.data, stations.data?.stations ?? [])
        : null,
    [scenario, config.data, stations.data],
  );

  if (detail.isError || config.isError) {
    return (
      <PageMessage
        title="Couldn’t load this run"
        description={(detail.error ?? config.error)?.message ?? ""}
      >
        <Link href="/scenarios" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          Back to scenarios
        </Link>
      </PageMessage>
    );
  }
  if (!scenario || !inputs || stations.isPending) {
    return <div className={styles.loading} role="status" aria-label="Loading the run" />;
  }
  if (scenario.status === "draft") {
    return (
      <PageMessage
        title="This scenario hasn’t been run yet"
        description="Start it with Run emulation on its config page."
      >
        <Link
          href={`/scenarios/${encodeURIComponent(scenarioId)}/config`}
          className={buttonVariants({ size: "sm" })}
        >
          Open the config
        </Link>
      </PageMessage>
    );
  }

  const projectName =
    projects.data?.find((p) => p.id === scenario.projectId)?.name ?? scenario.projectId;
  const mapName = maps.data?.find((m) => m.id === scenario.mapId)?.name ?? scenario.mapId;
  return <LiveRun inputs={inputs} context={`${projectName} · ${mapName}`} />;
}
