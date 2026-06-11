import { describe, expect, it } from "vitest";
import {
  formatGuardLabel,
  formatHhMmSs,
  formatLevel,
  formatMmSs,
  getGuardNicknameColor
} from "./format";

describe("formatMmSs", () => {
  it("formats server timestamps as minute and second", () => {
    expect(formatMmSs(Date.UTC(2024, 0, 1, 0, 2, 5))).toBe("02:05");
  });
});

describe("formatHhMmSs", () => {
  it("formats server timestamps as hour, minute and second", () => {
    expect(formatHhMmSs(new Date(2024, 0, 1, 9, 2, 5).getTime())).toBe(
      "09:02:05"
    );
  });
});

describe("badge formatters", () => {
  it("formats compact level and guard labels", () => {
    expect(formatLevel("UL", 12)).toBe("UL12");
    expect(formatLevel("粉", 8)).toBe("粉8");
    expect(formatGuardLabel(0)).toBe("无");
    expect(formatGuardLabel(1)).toBe("总督");
    expect(formatGuardLabel(2)).toBe("提督");
    expect(formatGuardLabel(3)).toBe("舰长");
  });

  it("maps guard type to fixed Bilibili-style nickname colors", () => {
    expect(getGuardNicknameColor(0)).toBe("#666666");
    expect(getGuardNicknameColor(1)).toBe("#F7A54C");
    expect(getGuardNicknameColor(2)).toBe("#E17AFF");
    expect(getGuardNicknameColor(3)).toBe("#00D1F1");
  });
});
