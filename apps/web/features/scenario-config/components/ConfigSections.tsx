import { getAtPath } from "../paths";
import { isFieldVisible, resolveField, setValueAtPath } from "../field-path";
import { isCustomized } from "../state/customized";
import type { CompositeRenderers, ReadyConfigEditor } from "../panel";
import type { CatalogSection } from "../types";
import { CatalogFieldControl } from "./CatalogField";
import { configSectionsStyles as styles } from "./ConfigSections.styles";

type ConfigSectionsProps = {
  sections: CatalogSection[];
  editor: ReadyConfigEditor;
  /** The station being edited, for sections whose paths contain `{stationId}`. */
  stationId?: string;
  /** Controls for the composite field types the sections use. */
  renderers?: CompositeRenderers;
  /** Replaces the fields of a section, by section id (for sections built from other data). */
  customSections?: Record<string, (section: CatalogSection) => React.ReactNode>;
  /** Changes one value. Defaults to editing that path of the config. */
  write?: (path: string, value: unknown) => void;
  /** Resets one value. Defaults to resetting that path. */
  reset?: (path: string) => void;
  /** Whether a path differs from its default. Defaults to checking the overrides. */
  isChanged?: (path: string) => boolean;
};

/**
 * Draws catalog sections and their fields from the catalog, with the current values: each
 * field gets its control, its changed dot and reset button. Fields that don't apply (their
 * `visibleWhen` condition fails) are left out.
 *
 * @param sections - The sections to draw.
 * @param editor - The loaded config editor.
 * @param stationId - The station being edited, if any.
 * @param renderers - Controls for the composite field types.
 * @param customSections - Section bodies drawn by the caller instead of the fields.
 * @param write - Changes one value; defaults to editing the config.
 * @param reset - Resets one value; defaults to resetting that path.
 * @param isChanged - Whether a path differs from its default.
 */
export function ConfigSections({
  sections,
  editor,
  stationId,
  renderers,
  customSections,
  write = (path, value) => editor.edit((config) => setValueAtPath(config, path, value)),
  reset = (path) => editor.reset([path]),
  isChanged = (path) => isCustomized(editor.overrides, path),
}: ConfigSectionsProps): React.JSX.Element {
  return (
    <div className={styles.root}>
      {sections.map((section) => {
        const custom = customSections?.[section.id];
        if (section.fieldsFrom && !custom) return null;

        return (
          <section key={section.id} className={styles.section} aria-label={section.label}>
            <h3 className={styles.title}>{section.label}</h3>
            {section.description && <p className={styles.description}>{section.description}</p>}
            {custom ? (
              custom(section)
            ) : (
              <div className={styles.fields}>
                {section.fields.map((raw) => {
                  const field = resolveField(raw, stationId);
                  if (field.path.includes("{") || !isFieldVisible(field, editor.config)) {
                    return null;
                  }
                  return (
                    <CatalogFieldControl
                      key={field.path}
                      renderers={renderers}
                      context={{
                        field,
                        path: field.path,
                        value: getAtPath(editor.config, field.path),
                        defaultValue: getAtPath(editor.defaults, field.path),
                        changed: isChanged(field.path),
                        config: editor.config,
                        write: (value) => write(field.path, value),
                        reset: () => reset(field.path),
                      }}
                    />
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
