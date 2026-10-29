import { SegmentedControl } from "../fields/SegmentedControl";
import { FieldShell } from "../fields/FieldShell";
import { bindingFor, type OperationsContext } from "./bindings";
import { OperationField } from "./OperationField";
import { pickFieldsStyles as styles } from "./PickFields.styles";

/**
 * The pick settings: the bin structure, then the catalog's groups (orders, allocation, picking
 * from the carrier, into the bin, bin handling, operator aids, clearing and labels). The first
 * group is open; the others open on click, and a group says how many of its settings changed.
 *
 * @param context - The operations context.
 */
export function PickFields({ context }: { context: OperationsContext }): React.JSX.Element {
  const { pick } = context.view.editor.catalog.operations;
  const bin = bindingFor(context, "pick", pick.binStructure.key);

  return (
    <div className={styles.root}>
      <FieldShell
        label={pick.binStructure.label}
        changed={bin.changed}
        onReset={bin.reset}
        layout="stacked"
      >
        <SegmentedControl
          label={pick.binStructure.label}
          options={pick.binStructure.options}
          value={String(bin.value)}
          onChange={bin.write}
        />
      </FieldShell>

      {pick.groups.map((group, index) => {
        const bound = group.fields.map((field) => ({
          field,
          ...bindingFor(context, "pick", field.key),
        }));
        const changedCount = bound.filter((item) => item.changed).length;
        return (
          <details key={group.id} className={styles.group} open={index === 0}>
            <summary className={styles.summary}>
              {group.label}
              {changedCount > 0 && (
                <span className={styles.changedTag}>{changedCount} changed</span>
              )}
            </summary>
            <div className={styles.fields}>
              {bound.map(({ field, value, changed, write, reset }) => (
                <OperationField
                  key={field.key}
                  field={field}
                  value={value as string | boolean}
                  changed={changed}
                  onChange={write}
                  onReset={reset}
                />
              ))}
            </div>
          </details>
        );
      })}
    </div>
  );
}
