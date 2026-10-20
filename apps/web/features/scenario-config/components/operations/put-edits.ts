import type { OperationsCatalog, StationConfig } from "../../types";

/** The put settings of a station. */
export type Put = StationConfig["operations"]["put"];

type Side = "front" | "back";
type PutFlow = OperationsCatalog["put"]["categories"][number]["flows"]["front"] extends
  Array<infer F> | undefined
  ? F
  : never;

/**
 * The put flows that can be chosen for one side of a category.
 *
 * @param catalog - The operations catalog.
 * @param category - `put`, `induction` or `extraction`.
 * @param side - `front` or `back`.
 */
export function putFlowsFor(catalog: OperationsCatalog, category: string, side: Side): PutFlow[] {
  return catalog.put.categories.find((c) => c.value === category)?.flows[side] ?? [];
}

/** The sides a category uses: Put lets the user pick; Induction and Extraction work at the back. */
export function usedSides(put: Put): Side[] {
  return put.category === "put" ? put.sides : ["back"];
}

/** The answer a flow starts with: the first option of its follow-up question, or null if it has none. */
function initialFollowUp(catalog: OperationsCatalog, flow: PutFlow | undefined): string | null {
  return flow?.followUp ? (catalog.put.followUps[flow.followUp]?.options[0]?.value ?? null) : null;
}

/**
 * Switches the put category. The sides go back to the back only, and each side starts on the
 * first flow of the new category with the first answer to its follow-up question.
 *
 * @param put - The current put settings.
 * @param category - The category to switch to.
 * @param catalog - The operations catalog.
 */
export function changeCategory(put: Put, category: string, catalog: OperationsCatalog): Put {
  const front = putFlowsFor(catalog, category, "front")[0];
  const back = putFlowsFor(catalog, category, "back")[0];
  return {
    ...put,
    category,
    sides: ["back"],
    behavior: { front: front?.id ?? put.behavior.front, back: back?.id ?? null },
    followUp: { front: initialFollowUp(catalog, front), back: initialFollowUp(catalog, back) },
  };
}

/**
 * Sets which sides Put works on. At least one side stays, and the list keeps front before back.
 *
 * @returns The put settings unchanged if no side is chosen.
 */
export function changeSides(put: Put, sides: Side[]): Put {
  const next = (["front", "back"] as const).filter((side) => sides.includes(side));
  return next.length === 0 ? put : { ...put, sides: next };
}

/**
 * Sets the flow of one side. The follow-up answer is reset to the first option of the new
 * flow's question, or cleared if the flow has none.
 *
 * @param put - The current put settings.
 * @param side - The side to change.
 * @param flowId - The id of the chosen flow.
 * @param catalog - The operations catalog.
 */
export function changeFlow(put: Put, side: Side, flowId: string, catalog: OperationsCatalog): Put {
  const flow = putFlowsFor(catalog, put.category, side).find(
    (candidate) => candidate.id === flowId,
  );
  return {
    ...put,
    behavior: { ...put.behavior, [side]: flowId },
    followUp: { ...put.followUp, [side]: initialFollowUp(catalog, flow) },
  };
}

/** Sets the answer to the follow-up question of one side. */
export function changeFollowUp(put: Put, side: Side, answer: string): Put {
  return { ...put, followUp: { ...put.followUp, [side]: answer } };
}
