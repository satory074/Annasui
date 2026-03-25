"use client";

import { useState, useCallback, useRef, useEffect } from "react";

const MIN_PPS = 0.5; // pixels per second minimum
const MAX_PPS = 100; // pixels per second maximum
const ZOOM_STEP = 1.25; // multiplicative zoom factor

interface UseTimelineScrollOptions {
  duration: number;
  containerWidth: number;
}

interface UseTimelineScrollReturn {
  pixelsPerSecond: number;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomToFit: () => void;
  handleWheel: (e: React.WheelEvent) => void;
}

export function useTimelineScroll({
  duration,
  containerWidth,
}: UseTimelineScrollOptions): UseTimelineScrollReturn {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Default zoom: fit entire duration in container
  const fitPps = duration > 0 && containerWidth > 0
    ? containerWidth / duration
    : 4;

  const [pixelsPerSecond, setPixelsPerSecond] = useState(fitPps);

  // Update fit when duration/container changes
  useEffect(() => {
    if (duration > 0 && containerWidth > 0) {
      setPixelsPerSecond(containerWidth / duration);
    }
  }, [duration, containerWidth]);

  const clampPps = useCallback(
    (pps: number) => Math.max(MIN_PPS, Math.min(MAX_PPS, pps)),
    []
  );

  const zoomIn = useCallback(() => {
    setPixelsPerSecond((prev) => clampPps(prev * ZOOM_STEP));
  }, [clampPps]);

  const zoomOut = useCallback(() => {
    setPixelsPerSecond((prev) => clampPps(prev / ZOOM_STEP));
  }, [clampPps]);

  const zoomToFit = useCallback(() => {
    if (duration > 0 && containerWidth > 0) {
      setPixelsPerSecond(clampPps(containerWidth / duration));
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollLeft = 0;
      }
    }
  }, [duration, containerWidth, clampPps]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();

      const container = scrollContainerRef.current;
      if (!container) return;

      // Get mouse position relative to container for zoom anchoring
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left + container.scrollLeft;

      setPixelsPerSecond((prev) => {
        const factor = e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
        const next = clampPps(prev * factor);

        // Anchor zoom to mouse position
        const ratio = next / prev;
        requestAnimationFrame(() => {
          if (container) {
            container.scrollLeft = mouseX * ratio - (e.clientX - rect.left);
          }
        });

        return next;
      });
    },
    [clampPps]
  );

  return {
    pixelsPerSecond,
    scrollContainerRef,
    zoomIn,
    zoomOut,
    zoomToFit,
    handleWheel,
  };
}
