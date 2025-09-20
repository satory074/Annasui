"use client";

import { SongSection } from "@/types";
import BaseTooltip from "@/components/ui/modal/BaseTooltip";
import SongInfoDisplay from "@/components/ui/song/SongInfoDisplay";

interface SongDetailTooltipProps {
  song: SongSection | null;
  isVisible: boolean;
  position: { x: number; y: number };
  onSeek?: (time: number) => void;
  onEdit?: (song: SongSection) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export default function SongDetailTooltip({
  song,
  isVisible,
  position,
  onSeek,
  onEdit,
  onMouseEnter,
  onMouseLeave
}: SongDetailTooltipProps) {
  if (!song) return null;

  return (
    <BaseTooltip
      isVisible={isVisible}
      position={position}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <SongInfoDisplay
        song={song}
        variant="compact"
        onSeek={onSeek}
        onEdit={onEdit}
      />
    </BaseTooltip>
  );
}