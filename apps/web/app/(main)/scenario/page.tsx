import { ScenarioBoard } from "./scenario-board";
import { getScenarios } from "./scenarios";

export default function ScenarioPage() {
  return <ScenarioBoard scenariosPromise={getScenarios()} />;
}
