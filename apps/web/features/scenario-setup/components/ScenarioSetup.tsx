"use client";

import Link from "next/link";
import { useState } from "react";

import { PageMessage } from "@/components/layout/PageMessage";
import { Button, buttonVariants } from "@/components/ui/button";
import { EditScenarioDialog } from "@/features/scenarios/components/EditScenarioDialog";
import { useProjectMaps, useProjects } from "@/features/scenarios/hooks";
import { ApiError } from "@/lib/api/errors";

import { SIM_DURATION } from "../constants";
import { useScenarioDetail } from "../hooks";
import type { ScenarioDetail } from "../types";
import { useSetupFlow } from "../use-setup-flow";
import { ContinueBar } from "./ContinueBar";
import { DatasetGrid } from "./DatasetGrid";
import { DatasetsSummary } from "./DatasetsSummary";
import { OrderProfile } from "./charts/OrderProfile";
import { scenarioSetupStyles as styles } from "./ScenarioSetup.styles";
import { SetupBreadcrumb } from "./SetupBreadcrumb";
import { SetupFooter } from "./SetupFooter";
import { SetupHeader } from "./SetupHeader";
import { SimulationDuration } from "./SimulationDuration";
import { ValidationErrors } from "./ValidationErrors";

/** The scenario's contents once it has loaded. */
function SetupContent({ scenario }: { scenario: ScenarioDetail }): React.JSX.Element {
  const flow = useSetupFlow(scenario.id, scenario.datasets);
  const [durationHours, setDurationHours] = useState<number>(SIM_DURATION.default);
  const [isEditing, setIsEditing] = useState(false);

  const projects = useProjects();
  const maps = useProjectMaps(scenario.projectId);
  const projectName =
    projects.data?.find((project) => project.id === scenario.projectId)?.name ?? scenario.projectId;
  const mapName = maps.data?.find((map) => map.id === scenario.mapId)?.name ?? scenario.mapId;

  const failed = flow.result !== null && !flow.result.passed && flow.result.issueCount > 0;

  return (
    <div className={styles.container}>
      <SetupBreadcrumb
        parts={[projectName, mapName, scenario.name]}
        onEdit={() => setIsEditing(true)}
      />
      <SetupHeader />

      {flow.isValidated ? (
        <DatasetsSummary datasets={scenario.datasets} flow={flow} />
      ) : (
        <>
          <DatasetGrid datasets={scenario.datasets} flow={flow} />
          <SetupFooter datasets={scenario.datasets} flow={flow} />
          {failed && flow.result && (
            <ValidationErrors result={flow.result} datasets={scenario.datasets} />
          )}
        </>
      )}

      {flow.isValidated && (
        <>
          <SimulationDuration hours={durationHours} onChange={setDurationHours} />
          <OrderProfile datasets={scenario.datasets} />
          <ContinueBar scenarioId={scenario.id} />
        </>
      )}

      <EditScenarioDialog scenario={scenario} open={isEditing} onOpenChange={setIsEditing} />
    </div>
  );
}

/**
 * The scenario setup screen (`/scenarios/[id]/setup`): loads the scenario, then shows the
 * dataset cards, validation, and once validated, the simulation duration and order profile.
 *
 * @param scenarioId - The id of the scenario from the URL.
 */
export function ScenarioSetup({ scenarioId }: { scenarioId: string }): React.JSX.Element {
  const detail = useScenarioDetail(scenarioId);

  if (detail.isPending) {
    return (
      <div className={styles.container}>
        <div className={styles.skeleton} role="status" aria-label="Loading scenario">
          <div className={styles.skeletonLine} />
          <div className={styles.skeletonLine} />
          <div className={styles.skeletonLine} />
        </div>
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

  return <SetupContent scenario={detail.data} />;
}
