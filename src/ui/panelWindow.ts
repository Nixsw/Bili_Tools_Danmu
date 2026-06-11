export const PERSON_PANEL_WIDTH = 180;
export const MAIN_DEFAULT_WIDTH = 420;
export const MAIN_ONLY_MIN_WIDTH = MAIN_DEFAULT_WIDTH;
export const DEFAULT_WINDOW_WIDTH = PERSON_PANEL_WIDTH + MAIN_DEFAULT_WIDTH;

export interface PersonPanelResizeInput {
  currentVisible: boolean;
  nextVisible: boolean;
  x: number;
  width: number;
  height: number;
  scaleFactor: number;
}

export interface PersonPanelResizePlan {
  x: number;
  width: number;
  height: number;
}

export function getPersonPanelResizePlan({
  currentVisible,
  nextVisible,
  x,
  width,
  height,
  scaleFactor
}: PersonPanelResizeInput): PersonPanelResizePlan | null {
  if (currentVisible === nextVisible) {
    return null;
  }

  const panelWidth = Math.round(PERSON_PANEL_WIDTH * scaleFactor);
  const minWidth = Math.round(MAIN_ONLY_MIN_WIDTH * scaleFactor);
  const delta = nextVisible
    ? panelWidth
    : -Math.min(panelWidth, Math.max(0, width - minWidth));

  return {
    x: x - delta,
    width: width + delta,
    height
  };
}
