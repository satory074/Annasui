"use client";

import { useState, useEffect, type RefObject } from "react";

/**
 * Returns the current width (in px) of the referenced element,
 * updated whenever the element resizes.
 */
export function useResizeObserver(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });

    observer.observe(el);
    // Set initial width
    setWidth(el.getBoundingClientRect().width);

    return () => observer.disconnect();
  }, [ref]);

  return width;
}
