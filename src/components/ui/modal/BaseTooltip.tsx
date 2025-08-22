"use client";

import { ReactNode, useEffect, useState } from "react";

interface BaseTooltipProps {
  isVisible: boolean;
  position: { x: number; y: number };
  children: ReactNode;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  className?: string;
}

export default function BaseTooltip({
  isVisible,
  position,
  children,
  onMouseEnter,
  onMouseLeave,
  className = ""
}: BaseTooltipProps) {
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  useEffect(() => {
    if (isVisible && typeof window !== 'undefined') {
      const tooltipWidth = 320;
      const tooltipHeight = 300;
      const padding = 16;

      let adjustedX = position.x;
      let adjustedY = position.y;

      if (adjustedX + tooltipWidth + padding > window.innerWidth) {
        adjustedX = position.x - tooltipWidth - padding;
      }

      if (adjustedY + tooltipHeight + padding > window.innerHeight) {
        adjustedY = position.y - tooltipHeight - padding;
      }

      if (adjustedX < padding) {
        adjustedX = padding;
      }

      if (adjustedY < padding) {
        adjustedY = padding;
      }

      setAdjustedPosition({ x: adjustedX, y: adjustedY });
    }
  }, [position, isVisible]);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-600 p-4 max-w-sm transition-all duration-200 opacity-100 scale-100 ${className}`}
      style={{
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
        pointerEvents: 'auto'
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}