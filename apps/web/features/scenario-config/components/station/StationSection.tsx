import { getAtPath } from "../../paths";
import { isFieldVisible, resolveField, setValueAtPath } from "../../field-path";
import type { FieldContext } from "../../panel";
import { isCustomized } from "../../state/customized";
import { followers, writeGroupStructure, writeStationStructure } from "../../state/station-edits";
import type { CatalogField, CatalogSection, StationConfig } from "../../types";
import { CatalogFieldControl } from "../CatalogField";
import { structureKeyOf } from "./field-edits";
import { OverrideNotice } from "./OverrideNotice";
import { stationSectionStyles as styles } from "./StationSection.styles";
import type { StationView } from "./station-view";

type StationSectionProps = {
  section: CatalogSection;
  view: StationView;
  /** Replaces the catalog fields, for sections whose body is drawn by another component. */
  children?: React.ReactNode;
};

type Structure = StationConfig["structure"];

/**
 * A section of the station panel. Sections that can be kept per station (schedule and
 * structure) start with a note when stations keep their own value. Structure edits follow the
 * design's rules: a type edit reaches only the type's stations that share its values, and a
 * station whose value then differs from most of its type keeps its own. A section with no
 * field to show is not drawn.
 *
 * @param section - The catalog section.
 * @param view - The station panel's view.
 * @param children - A custom body to draw instead of the fields.
 */
export function StationSection({
  section,
  view,
  children,
}: StationSectionProps): React.JSX.Element | null {
  const { editor, referenceId, isGroup, station, group } = view;
  const { config, defaults, overrides } = editor;

  const fields = children
    ? []
    : section.fields
        .map((field) => resolveField(field, referenceId))
        .filter((field) => isFieldVisible(field, config));
  if (!children && fields.length === 0) return null;

  function contextFor(field: CatalogField): FieldContext {
    const value = getAtPath(config, field.path);
    const defaultValue = getAtPath(defaults, field.path);
    const base = { field, path: field.path, value, defaultValue, config };
    const key = structureKeyOf(field.path);

    if (key && section.overrideSection === "structure") {
      const patchFor = (next: unknown): Partial<Structure> =>
        ({ [key]: next }) as Partial<Structure>;
      if (isGroup) {
        return {
          ...base,
          changed: followers(config, group, "structure", defaults).some((id) =>
            isCustomized(overrides, `station.stations.${id}.structure.${key}`),
          ),
          write: (next) =>
            editor.edit((c) => writeGroupStructure(c, group, patchFor(next), defaults)),
          reset: () =>
            editor.edit((c) => writeGroupStructure(c, group, patchFor(defaultValue), defaults)),
        };
      }
      return {
        ...base,
        changed: isCustomized(overrides, field.path),
        write: (next) => editor.edit((c) => writeStationStructure(c, station, patchFor(next))),
        reset: () => editor.edit((c) => writeStationStructure(c, station, patchFor(defaultValue))),
      };
    }

    // Other station values in a type view reach every station of the type.
    const own = `station.stations.${referenceId}.`;
    if (isGroup && field.path.startsWith(own)) {
      const paths = group.map((id) => `station.stations.${id}.${field.path.slice(own.length)}`);
      return {
        ...base,
        changed: paths.some((path) => isCustomized(overrides, path)),
        write: (next) =>
          editor.edit((c) => paths.reduce((acc, path) => setValueAtPath(acc, path, next), c)),
        reset: () => editor.reset(paths),
      };
    }
    return {
      ...base,
      changed: isCustomized(overrides, field.path),
      write: (next) => editor.edit((c) => setValueAtPath(c, field.path, next)),
      reset: () => editor.reset([field.path]),
    };
  }

  const overrideSection = section.overrideSection;
  return (
    <section className={styles.root} aria-label={section.label}>
      <h3 className={styles.title}>{section.label}</h3>
      {section.description && <p className={styles.description}>{section.description}</p>}
      {overrideSection && <OverrideNotice section={overrideSection} view={view} />}
      {children ?? (
        <div className={styles.fields}>
          {fields.map((field) => (
            <CatalogFieldControl key={field.path} context={contextFor(field)} />
          ))}
        </div>
      )}
    </section>
  );
}
