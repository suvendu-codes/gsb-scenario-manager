import { pageMessageStyles as styles } from "./PageMessage.styles";

/**
 * Centered full-page message with a title, short explanation and optional actions.
 * Used for the error and "page not found" pages.
 *
 * @param title - The heading.
 * @param description - One or two sentences explaining what happened.
 * @param children - Actions, for example buttons or links.
 */
export function PageMessage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className={styles.root}>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.description}>{description}</p>
      {children && <div className={styles.actions}>{children}</div>}
    </div>
  );
}
