import { describe, expect, it } from "vitest";
import {
  getFanMedalLevelClass,
  getFanMedalLabelClass,
  getFanMedalLayoutStyle,
  getFanMedalStyle,
  getGuardMedalIconUrl,
  getGuardMedalSourceUrl,
  getWealthMedalSourceUrl,
  getWealthMedalUrl
} from "./biliBadges";

describe("Bilibili wealth medals", () => {
  it("uses local cached official 36x16 wealth medal image resources", () => {
    expect(getWealthMedalUrl(0)).toBeNull();
    expect(getWealthMedalUrl(1)).toBe("/bili/wealth/1.png");
    expect(getWealthMedalUrl(80)).toBe("/bili/wealth/80.webp");
    expect(getWealthMedalUrl(100)).toBe(getWealthMedalUrl(80));
  });

  it("keeps the official Bilibili source URL map for asset provenance", () => {
    expect(getWealthMedalSourceUrl(1)).toBe(
      "https://i0.hdslb.com/bfs/live/119d1b5e2cc1ecff7dba8a3b2e66d1bcf9d85942.png"
    );
    expect(getWealthMedalSourceUrl(80)).toBe(
      "https://i0.hdslb.com/bfs/live/6da9d5d7e68722cb7ec018c4f15dcbe15937ce8f.webp"
    );
    expect(getWealthMedalSourceUrl(100)).toBe(getWealthMedalSourceUrl(80));
  });
});

describe("Bilibili fans medals", () => {
  it("uses official guard icons inside the fans medal label", () => {
    expect(getGuardMedalIconUrl(0)).toBeNull();
    expect(getGuardMedalIconUrl(1)).toBe("/bili/guard/1.png");
    expect(getGuardMedalIconUrl(2)).toBe("/bili/guard/2.png");
    expect(getGuardMedalIconUrl(3)).toBe("/bili/guard/3.png");
    expect(getGuardMedalSourceUrl(1)).toBe(
      "https://i0.hdslb.com/bfs/live/0d2b29717af2e7b1bbdc21a4fba8619636f82517.png"
    );
    expect(getGuardMedalSourceUrl(2)).toBe(
      "https://i0.hdslb.com/bfs/live/405bffdfd78bb562e0394dd828f8bf69ea01f400.png"
    );
    expect(getGuardMedalSourceUrl(3)).toBe(
      "https://i0.hdslb.com/bfs/live/00749d246e2b49b2328cb981de02142fb6aeceba.png"
    );
  });

  it("expands the label for guard icons and compacts it when there is no guard", () => {
    expect(getFanMedalLabelClass(0)).toBe("fans-medal-label is-compact");
    expect(getFanMedalLabelClass(1)).toBe("fans-medal-label guard");
    expect(getFanMedalLabelClass(2)).toBe("fans-medal-label guard");
    expect(getFanMedalLabelClass(3)).toBe("fans-medal-label guard");
  });

  it("uses layout widths that fit the fallback UI font", () => {
    expect(getFanMedalLayoutStyle(5, 0)).toMatchObject({
      "--fanMedalLabelWidth": "3px",
      "--fanMedalLevelWidth": "7px"
    });
    expect(getFanMedalLayoutStyle(20, 0)).toMatchObject({
      "--fanMedalLabelWidth": "3px",
      "--fanMedalLevelWidth": "13px"
    });
    expect(getFanMedalLayoutStyle(120, 0)).toMatchObject({
      "--fanMedalLabelWidth": "3px",
      "--fanMedalLevelWidth": "20px"
    });
    expect(getFanMedalLayoutStyle(20, 3)).toMatchObject({
      "--fanMedalIconLeft": "6px",
      "--fanMedalIconMarginLeft": "-12px",
      "--fanMedalLabelWidth": "16px",
      "--fanMedalLevelWidth": "13px"
    });
  });

  it("builds the official fans-medal gradient variables from level bands", () => {
    expect(getFanMedalStyle(0)).toEqual({});
    expect(getFanMedalStyle(36)).toMatchObject({
      "--borderColor": "#4C7DFF99",
      "--fanMedalTextColor": "#FFFFFF",
      "--fanMedalLevelColor": "#FFFFFF",
      backgroundImage: "linear-gradient(45deg, #4C7DFF99, #4C7DFF99)"
    });
  });

  it("keeps Bilibili digit width classes without showing a medal name", () => {
    expect(getFanMedalLevelClass(8)).toBe("one-digit-level");
    expect(getFanMedalLevelClass(29)).toBe("");
    expect(getFanMedalLevelClass(120)).toBe("three-digits-level");
  });
});
