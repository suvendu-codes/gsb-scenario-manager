import { ScenarioList } from "@/features/scenarios/components/ScenarioList";

import { scenariosPageStyles } from "./page.styles";

/** Scenario list page (`/scenarios`). */
export default function ScenariosPage(): React.JSX.Element {
  return (
    <div className={scenariosPageStyles.container}>
      <ScenarioList />
    </div>
  );
}
