import { describe, expect, test } from "vitest";
import {
  estimateViewportCapacity,
  shouldDistributeViewportSlack
} from "./viewportCapacity";

describe("estimateViewportCapacity", () => {
  test("expands a fixed 14-row estimate when the container has room for more compact rows", () => {
    expect(
      estimateViewportCapacity({
        containerHeight: 640,
        rowHeights: Array.from({ length: 14 }, () => 28),
        gap: 4,
        paddingTop: 0,
        paddingBottom: 8
      })
    ).toBe(19);
  });

  test("uses observed average row height when rows wrap", () => {
    expect(
      estimateViewportCapacity({
        containerHeight: 640,
        rowHeights: [28, 44, 44, 28],
        gap: 4,
        paddingTop: 0,
        paddingBottom: 8
      })
    ).toBe(15);
  });

  test("does not overestimate when observed rows already exceed the container", () => {
    expect(
      estimateViewportCapacity({
        containerHeight: 100,
        rowHeights: [80, 20, 20],
        gap: 4,
        paddingTop: 0,
        paddingBottom: 0
      })
    ).toBe(1);
  });
});

describe("shouldDistributeViewportSlack", () => {
  test("keeps sparse lists top-aligned", () => {
    expect(shouldDistributeViewportSlack(3, 5)).toBe(false);
  });

  test("fills the viewport once the list reaches the measured capacity", () => {
    expect(shouldDistributeViewportSlack(5, 5)).toBe(true);
    expect(shouldDistributeViewportSlack(6, 5)).toBe(true);
  });
});
