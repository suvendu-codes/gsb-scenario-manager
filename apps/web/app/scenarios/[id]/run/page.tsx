import { RunScreen } from "@/features/scenario-run/components/RunScreen";

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
