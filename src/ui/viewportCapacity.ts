export interface ViewportCapacityInput {
  containerHeight: number;
  rowHeights: number[];
  gap: number;
  paddingTop: number;
  paddingBottom: number;
  min?: number;
  max?: number;
}

export function estimateViewportCapacity({
  containerHeight,
  rowHeights,
  gap,
  paddingTop,
  paddingBottom,
  min = 1,
  max = 100
}: ViewportCapacityInput) {
  if (containerHeight <= 0 || rowHeights.length === 0) {
    return min;
  }

  const averageRowHeight =
    rowHeights.reduce((total, value) => total + value, 0) / rowHeights.length;
  const usableHeight = Math.max(0, containerHeight - paddingTop - paddingBottom);
  const estimated = Math.floor((usableHeight + gap) / (averageRowHeight + gap));

  return Math.min(max, Math.max(min, estimated));
}
