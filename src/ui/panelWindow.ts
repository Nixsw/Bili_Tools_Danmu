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

export interface PersonPanelWindowResizeInput {
  currentVisible: boolean;
  nextVisible: boolean;
  x: number;
  outerWidth: number;
  outerHeight: number;
  innerWidth: number;
  scaleFactor: number;
}

export interface PersonPanelWindowResizePlan extends PersonPanelResizePlan {
  contentWidth: number;
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

  const delta = getPersonPanelResizeDelta({
    currentVisible,
    nextVisible,
    innerWidth: width,
    scaleFactor
  });

  if (delta === null) {
    return null;
  }

  return {
    x: x - delta,
    width: width + delta,
    height
  };
}

export function getPersonPanelWindowResizePlan({
  currentVisible,
  nextVisible,
  x,
  outerWidth,
  outerHeight,
  innerWidth,
  scaleFactor
}: PersonPanelWindowResizeInput): PersonPanelWindowResizePlan | null {
  const delta = getPersonPanelResizeDelta({
    currentVisible,
    nextVisible,
    innerWidth,
    scaleFactor
  });

  if (delta === null) {
    return null;
  }

  return {
    x: x - delta,
    width: outerWidth + delta,
    height: outerHeight,
    contentWidth: Math.round((innerWidth + delta) / scaleFactor)
  };
}

function getPersonPanelResizeDelta({
  currentVisible,
  nextVisible,
  innerWidth,
  scaleFactor
}: {
  currentVisible: boolean;
  nextVisible: boolean;
  innerWidth: number;
  scaleFactor: number;
}) {
  if (currentVisible === nextVisible) {
    return null;
  }

  const panelWidth = Math.round(PERSON_PANEL_WIDTH * scaleFactor);
  const minWidth = Math.round(MAIN_ONLY_MIN_WIDTH * scaleFactor);
  return nextVisible
    ? panelWidth
    : -Math.min(panelWidth, Math.max(0, innerWidth - minWidth));
}
