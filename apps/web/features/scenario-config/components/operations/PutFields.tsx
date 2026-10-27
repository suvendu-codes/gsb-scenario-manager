import { Select } from "@/components/ui/select";

import { isCustomized } from "../../state/customized";
import { CheckChips } from "../fields/CheckChips";
import { FieldShell } from "../fields/FieldShell";
import { SegmentedControl } from "../fields/SegmentedControl";
import type { OperationsContext } from "./bindings";
import { operationPath } from "./operation-edits";
import {
  changeCategory,
  changeFlow,
  changeFollowUp,
  changeSides,
  putFlowsFor,
  sharedPut,
  usedSides,
  type Put,
} from "./put-edits";
import { putFieldsStyles as styles } from "./PutFields.styles";

const SIDE_LABELS = { front: "Front", back: "Back" } as const;
const NONE = "";
const MIXED = "mixed";

/**
 * The put settings: the category (Put, Induction or Extraction), for Put the sides it works on,
 * and for each side the put flow with its follow-up question when the flow has one. Switching
 * category starts each side on the first flow of the new category.
 *
 * When several stations are edited together and their categories differ, the category shows as
 * mixed and the flows stay hidden until one category is chosen for all of them. A flow that
 * differs shows as mixed, and its follow-up question is hidden until one flow is chosen.
 *
 * @param context - The operations context.
 */
export function PutFields({ context }: { context: OperationsContext }): React.JSX.Element {
  const { editor, referenceId } = context.view;
  const catalog = editor.catalog.operations;
  const put = editor.config.station.stations[referenceId].operations.put;
  const paths = context.targets.map((id) => operationPath(id, "put"));
  const changed = paths.some((path) => isCustomized(editor.overrides, path));
  const shared = sharedPut(
    context.targets.map((id) => editor.config.station.stations[id].operations.put),
  );

  function update(recipe: (current: Put) => Put): void {
    editor.edit((config) => {
      const next = structuredClone(config);
      for (const id of context.targets) {
        const operations = next.station.stations[id].operations;
        operations.put = recipe(operations.put);
      }
      return next;
    });
  }

  return (
    <div className={styles.root}>
      <FieldShell
        label="Put category"
        hint={
          shared.category === null
            ? "These stations use different categories. Choose one to set their flows together."
            : undefined
        }
        changed={changed}
        onReset={() => editor.reset(paths)}
        layout="stacked"
      >
        <SegmentedControl
          label="Put category"
          options={catalog.put.categories.map((c) => ({ value: c.value, label: c.label }))}
          value={shared.category ?? NONE}
          onChange={(category) => update((current) => changeCategory(current, category, catalog))}
        />
      </FieldShell>

      {shared.category === "put" && (
        <FieldShell
          label="Sides"
          hint="The sides of the station where put happens."
          layout="stacked"
        >
          <CheckChips
            label="Sides"
            options={[
              { value: "front", label: "Front" },
              { value: "back", label: "Back" },
            ]}
            value={put.sides}
            onChange={(sides) =>
              update((current) => changeSides(current, sides as Array<"front" | "back">))
            }
          />
        </FieldShell>
      )}

      {(shared.category === null ? [] : usedSides(put)).map((side) => {
        const flows = putFlowsFor(catalog, put.category, side);
        const flowId = put.behavior[side];
        const flow = flows.find((candidate) => candidate.id === flowId);
        const mixedFlow = !shared.sameFlow[side];
        const question =
          !mixedFlow && flow?.followUp ? catalog.put.followUps[flow.followUp] : undefined;
        const answer = put.followUp[side];
        const label = put.category === "put" ? `Put flow · ${SIDE_LABELS[side]}` : "Put flow";

        return (
          <div key={side} className={styles.side}>
            {put.category === "put" && <p className={styles.sideTitle}>{SIDE_LABELS[side]}</p>}
            <FieldShell label={label} layout="stacked">
              <Select
                aria-label={label}
                className={styles.select}
                value={mixedFlow ? MIXED : (flowId ?? NONE)}
                onChange={(event) =>
                  update((current) => changeFlow(current, side, event.target.value, catalog))
                }
              >
                {mixedFlow && (
                  <option value={MIXED} disabled>
                    Mixed
                  </option>
                )}
                {!mixedFlow && flowId === null && (
                  <option value={NONE} disabled>
                    Choose a flow…
                  </option>
                )}
                {flows.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </FieldShell>
            {question && (
              <FieldShell
                label={question.question}
                hint={question.options.find((option) => option.value === answer)?.config}
                layout="stacked"
              >
                <SegmentedControl
                  label={question.question}
                  options={question.options}
                  value={answer ?? question.options[0].value}
                  onChange={(value) =>
                    update((current) => changeFollowUp(current, side, value, catalog))
                  }
                />
              </FieldShell>
            )}
          </div>
        );
      })}
    </div>
  );
}
