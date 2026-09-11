"use client";

import { RefObject } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

/**
 * Windows a horizontally-positioned, ascending-order item list down to only
 * what's within (or near) the visible scroll viewport of `scrollElementRef`.
 * Items are still drawn at their own absolute pixel position (via
 * `getPosition`) — this hook only decides which ones are worth mounting.
 */
export function useVirtualHorizontalItems<T>(
  items: T[],
  getPosition: (item: T) => number,
  scrollElementRef: RefObject<HTMLElement | null>,
  overscan = 8
): T[] {
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollElementRef.current,
    estimateSize: (index) => {
      const current = getPosition(items[index]);
      const next = index + 1 < items.length ? getPosition(items[index + 1]) : current;
      return Math.max(next - current, 1);
    },
    horizontal: true,
    overscan,
  });

  return virtualizer.getVirtualItems().map((virtualItem) => items[virtualItem.index]);
}
