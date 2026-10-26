import { ScenarioSetup } from "@/features/scenario-setup/components/ScenarioSetup";

/** Scenario setup page (`/scenarios/[id]/setup`): upload and validate the scenario's datasets. */
export default async function ScenarioSetupPage({
  params,
}: PageProps<"/scenarios/[id]/setup">): Promise<React.JSX.Element> {
  const { id } = await params;
  return <ScenarioSetup scenarioId={id} />;
}
