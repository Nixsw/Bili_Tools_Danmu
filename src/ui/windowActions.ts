export type PersonPanelToggleIcon = "chevronsLeft" | "chevronsRight";

export function getPersonPanelToggleIcon(
  personVisible: boolean
): PersonPanelToggleIcon {
  return personVisible ? "chevronsRight" : "chevronsLeft";
}

export function getWindowDismissAction() {
  return {
    icon: "minus" as const,
    title: "最小化"
  };
}
