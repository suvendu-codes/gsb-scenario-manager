"use client";

import { useScenarios } from "../hooks";
import { ScenarioCard } from "./ScenarioCard";
import { scenarioListStyles } from "./ScenarioList.styles";
import { ScenarioListEmpty, ScenarioListError, ScenarioListLoading } from "./ScenarioListStates";

/**
 * Scenario list screen. Loads scenarios from `GET /scenarios` and shows a
 * loading, error, empty or populated state.
 */
export function ScenarioList(): React.JSX.Element {
  const { data, isPending, isError, error, refetch } = useScenarios();

  if (isPending) return <ScenarioListLoading />;
  if (isError) return <ScenarioListError message={error.message} onRetry={() => void refetch()} />;
  if (data.length === 0) return <ScenarioListEmpty />;

  return (
    <ul className={scenarioListStyles.list}>
      {data.map((scenario) => (
        <ScenarioCard key={scenario.id} scenario={scenario} />
      ))}
    </ul>
  );
}
