"use client";

import { Button } from "@/components/ui/button";

interface TimelineZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomToFit: () => void;
}

export function TimelineZoomControls({
  onZoomIn,
  onZoomOut,
  onZoomToFit,
}: TimelineZoomControlsProps) {
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 text-gray-500"
        onClick={onZoomOut}
        title="ズームアウト"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeWidth={2} d="M5 12h14" />
        </svg>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 text-gray-500"
        onClick={onZoomIn}
        title="ズームイン"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeWidth={2} d="M12 5v14M5 12h14" />
        </svg>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 text-gray-500"
        onClick={onZoomToFit}
        title="全体を表示"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4"
          />
        </svg>
      </Button>
    </div>
  );
}
