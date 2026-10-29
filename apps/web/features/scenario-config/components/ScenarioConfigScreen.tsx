"use client";

import Link from "next/link";
import { useState } from "react";

import { PageMessage } from "@/components/layout/PageMessage";
import { Button, buttonVariants } from "@/components/ui/button";
import { useProjectMaps, useProjects } from "@/features/scenarios/hooks";
import { useScenarioDetail } from "@/features/scenario-setup/hooks";
import type { ScenarioDetail } from "@/features/scenario-setup/types";
import { ApiError } from "@/lib/api/errors";

import { useConfigEditor } from "../use-config-editor";
import { ConfigHeader } from "./ConfigHeader";
import { isReady, type PanelSelection } from "../panel";
import { ConfigPanel } from "./ConfigPanel";
import { ScenarioTimeline } from "./timeline/ScenarioTimeline";
import { configPanels } from "./panels";
import { scenarioConfigScreenStyles as styles } from "./ScenarioConfigScreen.styles";

/** The screen once the scenario has loaded: header, the timeline's place, and the config panel. */
function ConfigContent({ scenario }: { scenario: ScenarioDetail }): React.JSX.Element {
  const editor = useConfigEditor(scenario.id, {
    projectId: scenario.projectId,
    mapId: scenario.mapId,
  });
  const [selection, setSelection] = useState<PanelSelection>({ area: "overview" });

  const projects = useProjects();
  const maps = useProjectMaps(scenario.projectId);
  const projectName =
    projects.data?.find((project) => project.id === scenario.projectId)?.name ?? scenario.projectId;
  const mapName = maps.data?.find((map) => map.id === scenario.mapId)?.name ?? scenario.mapId;

  return (
    <div className={styles.root}>
      <ConfigHeader
        scenarioId={scenario.id}
        scenarioName={scenario.name}
        status={scenario.status}
        context={`${projectName} · ${mapName}`}
        save={editor.save}
        editable={editor.editable}
        canUndo={editor.canUndo}
        canRedo={editor.canRedo}
        onUndo={editor.undo}
        onRedo={editor.redo}
      />
      {editor.save.state === "error" && (
        <p className={styles.alert} role="alert">
          Couldn’t save the last change: {editor.save.error} The panel now shows what the server
          has.
        </p>
      )}
      {editor.save.state === "out-of-sync" && (
        <div className={styles.alertRow} role="alert">
          <p>
            Couldn’t save the last change: {editor.save.error} The panel may not match what the
            server has, so editing is paused.
          </p>
          <Button variant="ghost" size="sm" onClick={editor.reload}>
            Reload
          </Button>
        </div>
      )}
      <div className={styles.body}>
        {isReady(editor) ? (
          <ScenarioTimeline
            editor={editor}
            outboundHourly={scenario.datasets.outbound?.profile.hourly}
            selection={selection}
            onSelect={setSelection}
          />
        ) : (
          <div className={styles.timelineLoading} aria-hidden="true" />
        )}
        <ConfigPanel
          scenarioId={scenario.id}
          setup={{ projectName, mapName }}
          editor={editor}
          selection={selection}
          onSelect={setSelection}
          panels={configPanels}
        />
      </div>
    </div>
  );
}

/**
 * The scenario config screen (`/scenarios/[id]/config`): loads the scenario, then shows the
 * config panel for it. Only drafts can be configured, so any other scenario gets a message.
 *
 * @param scenarioId - The id of the scenario from the URL.
 */
export function ScenarioConfigScreen({ scenarioId }: { scenarioId: string }): React.JSX.Element {
  const detail = useScenarioDetail(scenarioId);

  if (detail.isPending) {
    return (
      <div className={styles.skeleton} role="status" aria-label="Loading scenario">
        <div className={styles.skeletonLine} />
        <div className={styles.skeletonLine} />
        <div className={styles.skeletonLine} />
      </div>
    );
  }

  if (detail.isError) {
    const notFound = detail.error instanceof ApiError && detail.error.status === 404;
    return (
      <PageMessage
        title={notFound ? "Scenario not found" : "Couldn’t load this scenario"}
        description={
          notFound ? "This scenario doesn’t exist, or it was deleted." : detail.error.message
        }
      >
        {!notFound && (
          <Button size="sm" onClick={() => void detail.refetch()}>
            Try again
          </Button>
        )}
        <Link href="/scenarios" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          Back to scenarios
        </Link>
      </PageMessage>
    );
  }

  if (detail.data.status !== "draft") {
    return (
      <PageMessage
        title="This scenario can’t be edited"
        description="Only draft scenarios can be configured."
      >
        <Link href="/scenarios" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          Back to scenarios
        </Link>
      </PageMessage>
    );
  }

  return <ConfigContent scenario={detail.data} />;
}
