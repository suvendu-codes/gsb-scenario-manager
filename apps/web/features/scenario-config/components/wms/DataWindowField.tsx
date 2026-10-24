import { Select } from "@/components/ui/select";

import type { FieldContext } from "../../panel";
import { FieldShell } from "../fields/FieldShell";
import { endHourOptions, hourLabel, startHourOptions } from "./data-window";
import { dataWindowFieldStyles as styles } from "./DataWindowField.styles";

type DataWindowFieldProps = {
  context: FieldContext;
  /** Called with the new start and end hour when either changes. */
  onChange: (startHour: number, endHour: number) => void;
};

/**
 * The data window: the part of the day that feeds the run, set with a start and an end hour.
 * Each list only offers hours that keep the window from being empty.
 *
 * @param context - The field, with the `{ startHour, endHour }` value.
 * @param onChange - Called with the new start and end hour.
 */
export function DataWindowField({ context, onChange }: DataWindowFieldProps): React.JSX.Element {
  const { startHour, endHour } = context.value as { startHour: number; endHour: number };

  return (
    <FieldShell
      label={context.field.label}
      hint={context.field.hint}
      changed={context.changed}
      onReset={context.reset}
      layout="stacked"
    >
      <div className={styles.row}>
        <Select
          aria-label="Data window start"
          className={styles.select}
          value={startHour}
          onChange={(event) => onChange(Number(event.target.value), endHour)}
        >
          {startHourOptions(endHour).map((hour) => (
            <option key={hour} value={hour}>
              {hourLabel(hour)}
            </option>
          ))}
        </Select>
        <span className={styles.to}>to</span>
        <Select
          aria-label="Data window end"
          className={styles.select}
          value={endHour}
          onChange={(event) => onChange(startHour, Number(event.target.value))}
        >
          {endHourOptions(startHour).map((hour) => (
            <option key={hour} value={hour}>
              {hourLabel(hour)}
            </option>
          ))}
        </Select>
      </div>
    </FieldShell>
  );
}
