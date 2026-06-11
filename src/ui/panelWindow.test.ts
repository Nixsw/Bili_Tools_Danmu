import { describe, expect, test } from "vitest";
import {
  DEFAULT_WINDOW_WIDTH,
  getPersonPanelResizePlan,
  MAIN_DEFAULT_WIDTH,
  PERSON_PANEL_WIDTH
} from "./panelWindow";

describe("getPersonPanelResizePlan", () => {
  test("defaults to a 420px main stream plus a 180px person panel", () => {
    expect(MAIN_DEFAULT_WIDTH).toBe(420);
    expect(PERSON_PANEL_WIDTH).toBe(180);
    expect(DEFAULT_WINDOW_WIDTH).toBe(600);
  });

  test("expands the window to the left when the person panel opens", () => {
    expect(
      getPersonPanelResizePlan({
        currentVisible: false,
        nextVisible: true,
        x: 300,
        width: 460,
        height: 780,
        scaleFactor: 1
      })
    ).toEqual({ x: 120, width: 640, height: 780 });
  });

  test("narrows the window from the left when the person panel closes", () => {
    expect(
      getPersonPanelResizePlan({
        currentVisible: true,
        nextVisible: false,
        x: 120,
        width: 640,
        height: 780,
        scaleFactor: 1
      })
    ).toEqual({ x: 300, width: 460, height: 780 });
  });

  test("does not shrink below the main-only minimum width", () => {
    expect(
      getPersonPanelResizePlan({
        currentVisible: true,
        nextVisible: false,
        x: 40,
        width: 500,
        height: 780,
        scaleFactor: 1
      })
    ).toEqual({ x: 120, width: 420, height: 780 });
  });

  test("returns null if the visible state is unchanged", () => {
    expect(
      getPersonPanelResizePlan({
        currentVisible: true,
        nextVisible: true,
        x: 120,
        width: 640,
        height: 780,
        scaleFactor: 1
      })
    ).toBeNull();
  });
});
