import { useCallback, useEffect, useRef, useState } from "react";

interface Position {
  x: number;
  y: number;
}

interface UseDraggableReturn {
  position: Position | null;
  isDragging: boolean;
  handlePointerDown: (e: React.PointerEvent) => void;
  resetPosition: () => void;
}

export function useDraggable(): UseDraggableReturn {
  const [position, setPosition] = useState<Position | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    startPosX: number;
    startPosY: number;
    pointerId: number;
  } | null>(null);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Only drag on primary button
      if (e.button !== 0) return;

      const el = (e.currentTarget as HTMLElement).closest(
        "[data-draggable-container]",
      ) as HTMLElement | null;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startPosX: rect.left,
        startPosY: rect.top,
        pointerId: e.pointerId,
      };

      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      setIsDragging(true);
      e.preventDefault();
    },
    [],
  );

  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (!dragRef.current) return;

      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;

      let newX = dragRef.current.startPosX + dx;
      let newY = dragRef.current.startPosY + dy;

      // Clamp to viewport
      const maxX = window.innerWidth - 320;
      const maxY = window.innerHeight - 180;
      newX = Math.max(0, Math.min(newX, maxX));
      newY = Math.max(0, Math.min(newY, maxY));

      setPosition({ x: newX, y: newY });
    };

    const handlePointerUp = () => {
      dragRef.current = null;
      setIsDragging(false);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isDragging]);

  const resetPosition = useCallback(() => {
    setPosition(null);
  }, []);

  return { position, isDragging, handlePointerDown, resetPosition };
}
