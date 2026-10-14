import { formatDate } from "@/lib/format";

import type { Scenario } from "../types";
import { scenarioCardStyles } from "./ScenarioCard.styles";
import { StatusPill } from "./StatusPill";

/**
 * One scenario in the list: name, status, author and last update.
 * Its project and map are shown by the group headings around it.
 *
 * @param scenario - The scenario to display.
 */
export function ScenarioCard({ scenario }: { scenario: Scenario }): React.JSX.Element {
  return (
    <li className={scenarioCardStyles.root}>
      <div className={scenarioCardStyles.top}>
        <span className={scenarioCardStyles.name}>{scenario.name}</span>
        <StatusPill status={scenario.status} />
      </div>
      <p className={scenarioCardStyles.meta}>
        {scenario.authorId}
        <span className={scenarioCardStyles.separator} aria-hidden="true">
          ·
        </span>
        Updated {formatDate(scenario.updatedAt)}
      </p>
    </li>
  );
}
