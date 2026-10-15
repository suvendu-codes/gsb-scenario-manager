import { Check } from "lucide-react";

import { setupBreadcrumbStyles as styles } from "./SetupBreadcrumb.styles";

/**
 * The collapsed "Project › Map › Scenario" line at the top of the page, with an Edit link.
 *
 * @param parts - The names to show, in order (project, map, scenario).
 * @param onEdit - Called when Edit is clicked.
 */
export function SetupBreadcrumb({
  parts,
  onEdit,
}: {
  parts: string[];
  onEdit: () => void;
}): React.JSX.Element {
  return (
    <nav className={styles.root} aria-label="Scenario">
      <span className={styles.check} aria-hidden="true">
        <Check className={styles.checkIcon} />
      </span>
      <span className={styles.summary}>
        {parts.map((part, index) => (
          <span key={`${index}-${part}`}>
            {index > 0 && (
              <span className={styles.separator} aria-hidden="true">
                {" "}
                ›{" "}
              </span>
            )}
            {part}
          </span>
        ))}
      </span>
      <button type="button" className={styles.edit} onClick={onEdit}>
        Edit
      </button>
    </nav>
  );
}
