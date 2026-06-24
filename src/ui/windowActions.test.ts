import { describe, expect, it } from "vitest";
import {
  getMainUnreadAnchorAction,
  getPersonPanelToggleIcon,
  getWindowDismissAction
} from "./windowActions";

describe("window actions", () => {
  it("uses directional chevrons for the person panel toggle", () => {
    expect(getPersonPanelToggleIcon(true)).toBe("chevronsRight");
    expect(getPersonPanelToggleIcon(false)).toBe("chevronsLeft");
  });

  it("uses minimize as the only window dismiss action", () => {
    expect(getWindowDismissAction()).toEqual({
      icon: "minus",
      title: "最小化"
    });
  });

  it("uses a separated top action for locating the main unread anchor", () => {
    expect(getMainUnreadAnchorAction()).toEqual({
      icon: "locateFixed",
      title: "定位未读消息",
      className: "icon-button main-unread-anchor-button"
    });
  });
});
