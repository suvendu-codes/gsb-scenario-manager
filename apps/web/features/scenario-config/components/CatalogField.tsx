import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { getAtPath } from "../paths";
import type { CompositeRenderers, FieldContext } from "../panel";
import { catalogFieldStyles as styles } from "./CatalogField.styles";
import { CheckChips } from "./fields/CheckChips";
import { FieldShell } from "./fields/FieldShell";
import { OptionCards } from "./fields/OptionCards";
import { SegmentedControl } from "./fields/SegmentedControl";
import { Stepper } from "./fields/Stepper";
import { Toggle } from "./fields/Toggle";

/** "07:00" for hour 7. */
function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

/**
 * The control for one catalog field, chosen by the field's type, inside its label frame.
 * Field types with no generic control (`dataWindow`, `weights`, `schedule`) are drawn by the
 * matching entry of `renderers`, and nothing is shown if there is none.
 *
 * @param context - The field with its current value and the functions to change or reset it.
 * @param renderers - Controls for the composite field types.
 */
export function CatalogFieldControl({
  context,
  renderers,
}: {
  context: FieldContext;
  renderers?: CompositeRenderers;
}): React.JSX.Element | null {
  const { field, value, changed, write, reset } = context;
  const shell = { label: field.label, changed, onReset: reset };

  switch (field.type) {
    case "stepper": {
      const limit = field.maxPath ? Number(getAtPath(context.config, field.maxPath)) : field.max;
      return (
        <FieldShell {...shell} hint={field.hint}>
          <Stepper
            label={field.label}
            value={Number(value)}
            min={field.min}
            max={Number.isFinite(limit) ? Math.min(field.max, limit) : field.max}
            step={field.step}
            unit={field.unit}
            onChange={write}
          />
        </FieldShell>
      );
    }
    case "toggle":
      return (
        <FieldShell {...shell} hint={field.hint}>
          <Toggle label={field.label} checked={value === true} onChange={write} />
        </FieldShell>
      );
    case "choice": {
      if (field.variant === "select") {
        const chosen = field.options.find((option) => option.value === value);
        return (
          <FieldShell {...shell} hint={field.hint ?? chosen?.note} layout="stacked">
            <Select
              aria-label={field.label}
              className={styles.select}
              value={String(value)}
              onChange={(event) => write(event.target.value)}
            >
              {field.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </FieldShell>
        );
      }
      return (
        <FieldShell {...shell} hint={field.hint} layout="stacked">
          {field.variant === "cards" ? (
            <OptionCards
              label={field.label}
              options={field.options}
              value={String(value)}
              onChange={write}
            />
          ) : (
            <SegmentedControl
              label={field.label}
              options={field.options}
              value={String(value)}
              onChange={write}
            />
          )}
        </FieldShell>
      );
    }
    case "multiCheck":
      return (
        <FieldShell {...shell} hint={field.hint} layout="stacked">
          <CheckChips
            label={field.label}
            options={field.options}
            value={Array.isArray(value) ? (value as string[]) : []}
            minSelected={field.minSelected}
            onChange={write}
          />
        </FieldShell>
      );
    case "hour": {
      const hours = Array.from({ length: field.max - field.min + 1 }, (_, i) => field.min + i);
      return (
        <FieldShell {...shell} hint={field.hint}>
          <Select
            aria-label={field.label}
            className={cn(styles.select, styles.hourSelect)}
            value={String(value)}
            onChange={(event) => write(Number(event.target.value))}
          >
            {hours.map((hour) => (
              <option key={hour} value={hour}>
                {hourLabel(hour)}
              </option>
            ))}
          </Select>
        </FieldShell>
      );
    }
    case "dataWindow":
    case "weights":
    case "schedule":
      return <>{renderers?.[field.type]?.(context) ?? null}</>;
  }
}
