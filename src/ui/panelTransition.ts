export function getEffectivePanelCollapsed(
  configPanelCollapsed: boolean,
  pendingPanelCollapsed: boolean | null
) {
  return pendingPanelCollapsed ?? configPanelCollapsed;
}

export function getPanelTransitionClassName({
  personVisible,
  splitDragging,
  panelGeometryChanging
}: {
  personVisible: boolean;
  splitDragging: boolean;
  panelGeometryChanging: boolean;
}) {
  return [
    "content-grid",
    personVisible ? "with-person" : "",
    splitDragging ? "is-splitting" : "",
    panelGeometryChanging ? "is-panel-geometry-changing" : ""
  ]
    .filter(Boolean)
    .join(" ");
}
