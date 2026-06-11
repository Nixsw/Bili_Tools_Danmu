import { describe, expect, test } from "vitest";
import { estimateViewportCapacity } from "./viewportCapacity";

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
});
