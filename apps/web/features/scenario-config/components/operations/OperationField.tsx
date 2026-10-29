import { Select } from "@/components/ui/select";

import type { OperationsCatalog } from "../../types";
import { FieldShell } from "../fields/FieldShell";
import { Toggle } from "../fields/Toggle";
import { operationFieldStyles as styles } from "./OperationField.styles";

/** One pick or audit setting from the operations catalog: a choice or a toggle. */
export type OperationFieldDef = OperationsCatalog["pick"]["groups"][number]["fields"][number];

type OperationFieldProps = {
  field: OperationFieldDef;
  value: string | boolean;
  changed: boolean;
  onChange: (value: string | boolean) => void;
  onReset: () => void;
};

/**
 * The control for one operations setting: a switch for a toggle, a list for a choice. A choice
 * shows the note of the chosen option under its label.
 *
 * @param field - The setting from the catalog.
 * @param value - Its current value.
 * @param changed - Whether it differs from the default.
 * @param onChange - Called with the new value.
 * @param onReset - Called when the reset button is clicked.
 */
export function OperationField({
  field,
  value,
  changed,
  onChange,
  onReset,
}: OperationFieldProps): React.JSX.Element {
  if (field.type === "toggle") {
    return (
      <FieldShell label={field.label} hint={field.description} changed={changed} onReset={onReset}>
        <Toggle label={field.label} checked={value === true} onChange={onChange} />
      </FieldShell>
    );
  }

  const chosen = field.options.find((option) => option.value === value);
  return (
    <FieldShell
      label={field.label}
      hint={field.description ?? chosen?.note}
      changed={changed}
      onReset={onReset}
      layout="stacked"
    >
      <Select
        aria-label={field.label}
        className={styles.select}
        value={String(value)}
        onChange={(event) => onChange(event.target.value)}
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
