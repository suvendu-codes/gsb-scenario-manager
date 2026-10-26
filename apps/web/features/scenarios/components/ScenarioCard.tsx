import Link from "next/link";

import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";

import type { Scenario } from "../types";
import { scenarioCardStyles } from "./ScenarioCard.styles";
import { StatusPill } from "./StatusPill";

/**
 * One scenario in the list: name, status, author and last update.
 * Its project and map are shown by the group headings around it.
 * A draft is a link that opens its setup page; other scenarios are not clickable yet.
 *
 * @param scenario - The scenario to display.
 */
export function ScenarioCard({ scenario }: { scenario: Scenario }): React.JSX.Element {
  const isDraft = scenario.status === "draft";

  return (
    <li className={cn(scenarioCardStyles.root, isDraft && scenarioCardStyles.rootClickable)}>
      <div className={scenarioCardStyles.top}>
        {isDraft ? (
          <Link
            href={`/scenarios/${scenario.id}/setup`}
            className={cn(scenarioCardStyles.name, scenarioCardStyles.nameLink)}
          >
            {scenario.name}
          </Link>
        ) : (
          <span className={scenarioCardStyles.name}>{scenario.name}</span>
        )}
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
