import type { Metadata } from "next";

import { RunScreen } from "@/features/scenario-run/components/RunScreen";

export const metadata: Metadata = {
  title: "Live run · Scenario Manager",
  description: "The scenario's emulation as it runs.",
};

/**
 * Live emulation page (`/scenarios/[id]/run`): the run of a scenario as it plays. Entirely
 * mocked for now; see `features/scenario-run/live/engine.ts`.
 */
export default async function ScenarioRunPage({
  params,
}: PageProps<"/scenarios/[id]/run">): Promise<React.JSX.Element> {
  const { id } = await params;
  return <RunScreen scenarioId={id} />;
}
