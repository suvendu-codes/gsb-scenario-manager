import type { ProjectGroup } from "../types";
import { ScenarioCard } from "./ScenarioCard";
import { scenarioGroupsStyles as styles } from "./ScenarioGroups.styles";

/** Builds the small text after a project name, for example "RTP ecom + retail · 5 scenarios". */
function projectSubtitle(description: string, total: number): string {
  const count = `${total} scenario${total === 1 ? "" : "s"}`;
  return description ? `${description} · ${count}` : count;
}

/**
 * The scenario list grouped by project, then by map. Each map heading shows
 * how many scenarios use that map.
 *
 * @param groups - Project groups to render, already filtered and ordered.
 */
export function ScenarioGroups({ groups }: { groups: ProjectGroup[] }): React.JSX.Element {
  return (
    <>
      {groups.map(({ project, maps, total }) => (
        <section key={project.id} className={styles.project}>
          <h2 className={styles.projectHeading}>
            {project.name}
            <span className={styles.projectSub}>{projectSubtitle(project.description, total)}</span>
          </h2>
          {maps.map(({ map, scenarios }) => (
            <div key={map.id} className={styles.map}>
              <h3 className={styles.mapHeading}>
                {map.name}
                <span className={styles.mapCount}>{scenarios.length}</span>
              </h3>
              <ul className={styles.list}>
                {scenarios.map((scenario) => (
                  <ScenarioCard key={scenario.id} scenario={scenario} />
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}
    </>
  );
}
