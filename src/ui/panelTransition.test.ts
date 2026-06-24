import { describe, expect, it } from "vitest";
import {
  getEffectivePanelCollapsed,
  getPanelTransitionClassName
} from "./panelTransition";

describe("panel transition", () => {
  it("uses the pending collapse state while geometry is changing", () => {
    expect(getEffectivePanelCollapsed(false, true)).toBe(true);
    expect(getEffectivePanelCollapsed(true, false)).toBe(false);
    expect(getEffectivePanelCollapsed(true, null)).toBe(true);
  });

  it("marks panel geometry changes so CSS transitions can be disabled", () => {
    expect(
      getPanelTransitionClassName({
        personVisible: true,
        splitDragging: false,
        panelGeometryChanging: true
      })
    ).toBe("content-grid with-person is-panel-geometry-changing");
  });

  it("keeps splitter dragging class independent from geometry changes", () => {
    expect(
      getPanelTransitionClassName({
        personVisible: false,
        splitDragging: true,
        panelGeometryChanging: false
      })
    ).toBe("content-grid is-splitting");
  });
});
