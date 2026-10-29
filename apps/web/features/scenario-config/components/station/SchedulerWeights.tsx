import { Select } from "@/components/ui/select";

import { setValueAtPath } from "../../field-path";
import type { FieldContext, ReadyConfigEditor } from "../../panel";
import { presetFor, weightShares } from "../../state/scheduler";
import { FieldShell } from "../fields/FieldShell";
import { Stepper } from "../fields/Stepper";
import { schedulerWeightsStyles as styles } from "./SchedulerWeights.styles";

const CUSTOM = "custom";

type Weights = Parameters<typeof weightShares>[0];

/**
 * The pick scheduler: a strategy list of presets, and one weight per factor with its share of
 * the cycle. Choosing a preset sets all the weights; the list shows "Custom" once they match
 * no preset. Only the weights are saved.
 *
 * @param context - The weights field, with its value and the function to reset it.
 * @param editor - The loaded config editor.
 */
export function SchedulerWeights({
  context,
  editor,
}: {
  context: FieldContext;
  editor: ReadyConfigEditor;
}): React.JSX.Element | null {
  const { field } = context;
  if (field.type !== "weights") return null;

  const weights = context.value as Weights;
  const preset = presetFor(weights, editor.catalog.presets);
  const shares = weightShares(weights);

  return (
    <div className={styles.root}>
      <FieldShell
        label="Strategy"
        changed={context.changed}
        onReset={context.reset}
        layout="stacked"
      >
        <Select
          aria-label="Scheduler strategy"
          className={styles.select}
          value={preset?.id ?? CUSTOM}
          onChange={(event) => {
            const chosen = editor.catalog.presets.find((p) => p.id === event.target.value);
            if (chosen) {
              editor.edit((config) => setValueAtPath(config, context.path, { ...chosen.weights }));
            }
          }}
        >
          {editor.catalog.presets.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
          {!preset && (
            <option value={CUSTOM} disabled>
              Custom
            </option>
          )}
        </Select>
      </FieldShell>

      <div className={styles.rows}>
        {field.items.map((item) => (
          <div key={item.key} className={styles.row}>
            <div className={styles.rowHead}>
              <span className={styles.rowText}>
                <span className={styles.rowLabel}>{item.label}</span>
                <span className={styles.rowNote}>{item.note}</span>
              </span>
              <Stepper
                label={item.label}
                value={weights[item.key]}
                min={field.min}
                max={field.max}
                onChange={(value) =>
                  editor.edit((config) =>
                    setValueAtPath(config, `${context.path}.${item.key}`, value),
                  )
                }
              />
            </div>
            <div className={styles.share}>
              <span className={styles.track} aria-hidden="true">
                <span className={styles.fill} style={{ width: `${shares[item.key]}%` }} />
              </span>
              <span className={styles.shareText}>{shares[item.key]}% of cycle</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
