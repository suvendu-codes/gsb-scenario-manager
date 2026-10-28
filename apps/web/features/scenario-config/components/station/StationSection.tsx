import { getAtPath } from "../../paths";
import { isFieldVisible, resolveField, setValueAtPath } from "../../field-path";
import type { FieldContext } from "../../panel";
import { isCustomized } from "../../state/customized";
import {
  editableStations,
  writeSharedStructure,
  writeStationStructure,
} from "../../state/station-edits";
import type { CatalogField, CatalogSection, StationConfig } from "../../types";
import { CatalogFieldControl } from "../CatalogField";
import { ApplyTo } from "./ApplyTo";
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
 * structure) start with the "Apply to" list in the All-stations view and with a note when
 * stations keep their own value. Structure edits follow the design's rules: an All-stations
 * edit reaches only the stations that share, and editing one station marks it as keeping its own.
 * A section whose fields all belong to hardware the station lacks is not drawn.
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
  const { editor, referenceId, isAll, station } = view;
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
      if (isAll) {
        return {
          ...base,
          changed: editableStations(config, "structure").some((id) =>
            isCustomized(overrides, `station.stations.${id}.structure.${key}`),
          ),
          write: (next) => editor.edit((c) => writeSharedStructure(c, patchFor(next))),
          reset: () => editor.edit((c) => writeSharedStructure(c, patchFor(defaultValue))),
        };
      }
      return {
        ...base,
        changed: isCustomized(overrides, field.path),
        write: (next) => editor.edit((c) => writeStationStructure(c, station, patchFor(next))),
        reset: () => editor.edit((c) => writeStationStructure(c, station, patchFor(defaultValue))),
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
      {overrideSection && isAll && <ApplyTo section={overrideSection} view={view} />}
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
