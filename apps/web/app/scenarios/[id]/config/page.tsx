import { ScenarioConfigScreen } from "@/features/scenario-config/components/ScenarioConfigScreen";

/**
 * Scenario config page (`/scenarios/[id]/config`): review and change the settings the scenario
 * will run with, in the three modules (WMS, Station Config and Agent).
 */
export default async function ScenarioConfigPage({
  params,
}: PageProps<"/scenarios/[id]/config">): Promise<React.JSX.Element> {
  const { id } = await params;
  return <ScenarioConfigScreen scenarioId={id} />;
}
