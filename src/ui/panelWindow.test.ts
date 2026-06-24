import { describe, expect, test } from "vitest";
import {
  DEFAULT_WINDOW_WIDTH,
  getPersonPanelResizePlan,
  getPersonPanelWindowResizePlan,
  MAIN_DEFAULT_WIDTH,
  PERSON_PANEL_WIDTH
} from "./panelWindow";

describe("getPersonPanelResizePlan", () => {
  test("defaults to a 420px main stream plus a 180px person panel", () => {
    expect(MAIN_DEFAULT_WIDTH).toBe(420);
    expect(PERSON_PANEL_WIDTH).toBe(180);
    expect(DEFAULT_WINDOW_WIDTH).toBe(600);
  });

  test("keeps the right edge anchored when the person panel opens", () => {
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

  test("keeps the right edge anchored when the person panel closes", () => {
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

describe("getPersonPanelWindowResizePlan", () => {
  test("uses outer width for window geometry and inner width for content width", () => {
    expect(
      getPersonPanelWindowResizePlan({
        currentVisible: false,
        nextVisible: true,
        x: 100,
        outerWidth: 616,
        outerHeight: 780,
        innerWidth: 600,
        scaleFactor: 1
      })
    ).toEqual({ x: -80, width: 796, height: 780, contentWidth: 780 });
  });

  test("keeps the right edge anchored without accumulating border drift", () => {
    const opened = getPersonPanelWindowResizePlan({
      currentVisible: false,
      nextVisible: true,
      x: 100,
      outerWidth: 616,
      outerHeight: 780,
      innerWidth: 600,
      scaleFactor: 1
    });
    expect(opened).not.toBeNull();
    const closed = getPersonPanelWindowResizePlan({
      currentVisible: true,
      nextVisible: false,
      x: opened!.x,
      outerWidth: opened!.width,
      outerHeight: 780,
      innerWidth: opened!.contentWidth,
      scaleFactor: 1
    });

    expect(opened!.x + opened!.width).toBe(716);
    expect(closed).toEqual({ x: 100, width: 616, height: 780, contentWidth: 600 });
  });
});
