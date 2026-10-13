import { Suspense } from "react";

import { CreateScenarioDialog } from "@/features/scenarios/components/CreateScenarioDialog";
import { ScenarioList } from "@/features/scenarios/components/ScenarioList";

import { scenariosPageStyles } from "./page.styles";

/** Scenario list page (`/scenarios`), with the create modal opened by `?create=1`. */
export default function ScenariosPage(): React.JSX.Element {
  return (
    <div className={scenariosPageStyles.container}>
      <ScenarioList />
      <Suspense>
        <CreateScenarioDialog />
      </Suspense>
    </div>
  );
}
