import { describe, expect, it } from "vitest";

import { buildDefaults } from "@/lib/mock/defaults";
import { applyEdit, applyRedo, applyUndo, initialEditorState } from "./editor-history";

const defaults = buildDefaults();

describe("applyEdit", () => {
  it("records an edit and asks for it to be saved", () => {
    const step = applyEdit(initialEditorState({}), defaults, { set: { "wms.criticalPct": 20 } });

    expect(step.state.overrides).toEqual({ "wms.criticalPct": 20 });
    expect(step.state.undo).toHaveLength(1);
    expect(step.send).toEqual({ set: { "wms.criticalPct": 20 } });
  });

  it("does nothing when the edit changes nothing", () => {
    const state = initialEditorState({});
    const step = applyEdit(state, defaults, { set: { "wms.criticalPct": 10 } });

    expect(step.state).toBe(state);
    expect(step.send).toBeNull();
  });

  it("clears what could have been redone", () => {
    let state = applyEdit(initialEditorState({}), defaults, {
      set: { "wms.criticalPct": 20 },
    }).state;
    state = applyUndo(state, defaults)!.state;
    expect(state.redo).toHaveLength(1);

    state = applyEdit(state, defaults, { set: { "wms.criticalPct": 30 } }).state;
    expect(state.redo).toHaveLength(0);
  });

  it("keeps at most 100 edits to undo", () => {
    let state = initialEditorState({});
    for (let i = 0; i < 120; i++) {
      state = applyEdit(state, defaults, { set: { "wms.criticalPct": 5 * ((i % 19) + 1) } }).state;
    }
    expect(state.undo.length).toBeLessThanOrEqual(100);
  });
});

describe("applyUndo and applyRedo", () => {
  it("returns null when there is nothing to undo or redo", () => {
    const state = initialEditorState({});
    expect(applyUndo(state, defaults)).toBeNull();
    expect(applyRedo(state, defaults)).toBeNull();
  });

  it("walks back and forth through edits, sending the patch each time", () => {
    const first = applyEdit(initialEditorState({}), defaults, { set: { "wms.criticalPct": 20 } });
    const second = applyEdit(first.state, defaults, {
      set: { "wms.criticalPct": 30, "agent.fleet.htm": 12 },
    });

    const undone = applyUndo(second.state, defaults)!;
    expect(undone.state.overrides).toEqual({ "wms.criticalPct": 20 });
    expect(undone.send).toEqual({ set: { "wms.criticalPct": 20 }, reset: ["agent.fleet.htm"] });

    const undoneAgain = applyUndo(undone.state, defaults)!;
    expect(undoneAgain.state.overrides).toEqual({});

    const redone = applyRedo(undoneAgain.state, defaults)!;
    expect(redone.state.overrides).toEqual({ "wms.criticalPct": 20 });
    expect(redone.send).toEqual({ set: { "wms.criticalPct": 20 } });

    const redoneAgain = applyRedo(redone.state, defaults)!;
    expect(redoneAgain.state.overrides).toEqual(second.state.overrides);
    expect(redoneAgain.state.redo).toHaveLength(0);
  });
});
