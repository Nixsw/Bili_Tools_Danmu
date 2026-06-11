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
  let measuredHeight = 0;
  let measuredCapacity = 0;

  for (const rowHeight of rowHeights) {
    const nextHeight =
      measuredHeight + (measuredCapacity > 0 ? gap : 0) + rowHeight;
    if (nextHeight > usableHeight) {
      return Math.min(max, Math.max(min, measuredCapacity));
    }

    measuredHeight = nextHeight;
    measuredCapacity += 1;
  }

  const estimated = Math.floor((usableHeight + gap) / (averageRowHeight + gap));

  return Math.min(max, Math.max(min, estimated));
}

export function shouldDistributeViewportSlack(
  visibleCount: number,
  viewportSize: number | null | undefined
) {
  return typeof viewportSize === "number" && visibleCount >= viewportSize;
}
