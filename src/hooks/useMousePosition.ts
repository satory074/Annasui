'use client';

import { useEffect, useState, useRef } from 'react';
import { logger } from '@/lib/utils/logger';

export interface MousePosition {
  x: number;
  y: number;
  isNearLeftEdge: boolean;
  isNearRightEdge: boolean;
  lastMoved: number;
}

/**
 * マウスの位置を追跡し、画面端に近づいているかを判定するカスタムフック
 */
export function useMousePosition(edgeThreshold: number = 150): MousePosition {
  const [mousePosition, setMousePosition] = useState<MousePosition>({
    x: 0,
    y: 0,
    isNearLeftEdge: false,
    isNearRightEdge: false,
    lastMoved: Date.now()
  });

  const lastUpdateTime = useRef<number>(0);
  const lastLogTime = useRef<number>(0);
  const requestRef = useRef<number | null>(null);

  // プロダクション環境での初期化ログ
  useEffect(() => {
    logger.debug('🖱️ useMousePosition: Hook initialized', {
      edgeThreshold,
      initialPosition: mousePosition,
      isProduction: process.env.NODE_ENV === 'production',
      windowSize: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'SSR',
      timestamp: new Date().toISOString()
    });
  }, [edgeThreshold, mousePosition]); // edgeThreshold が変わった時のみログ出力

  useEffect(() => {
    const updateMousePosition = (e: MouseEvent) => {
      const now = performance.now();
      
      // デバウンス処理（16ms間隔でスロットル）
      if (now - lastUpdateTime.current < 16) {
        return;
      }
      lastUpdateTime.current = now;

      const windowWidth = window.innerWidth;
      const x = e.clientX;
      const y = e.clientY;
      
      const isNearLeftEdge = x <= edgeThreshold;
      const isNearRightEdge = x >= (windowWidth - edgeThreshold);
      
      const newPosition: MousePosition = {
        x,
        y,
        isNearLeftEdge,
        isNearRightEdge,
        lastMoved: Date.now()
      };

      setMousePosition(newPosition);

      // 定期的にマウス位置をログ出力（デバッグ用、5秒間隔）
      if (now - lastLogTime.current > 5000) {
        logger.debug('🖱️ useMousePosition: Position update', {
          x,
          y,
          isNearLeftEdge,
          isNearRightEdge,
          windowWidth,
          edgeThreshold,
          timestamp: new Date().toISOString()
        });
        lastLogTime.current = now;
      }

      logger.debug('Mouse position updated', {
        x,
        y,
        isNearLeftEdge,
        isNearRightEdge,
        windowWidth,
        edgeThreshold
      });
    };

    const debouncedUpdateMousePosition = (e: MouseEvent) => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      requestRef.current = requestAnimationFrame(() => updateMousePosition(e));
    };

    // マウス移動イベントリスナーを登録
    document.addEventListener('mousemove', debouncedUpdateMousePosition, { passive: true });

    logger.debug('🖱️ useMousePosition: Event listener registered', {
      edgeThreshold,
      timestamp: new Date().toISOString()
    });

    // 初回位置設定（画面中央を仮定）
    const initialX = window.innerWidth / 2;
    const initialY = window.innerHeight / 2;
    setMousePosition({
      x: initialX,
      y: initialY,
      isNearLeftEdge: initialX <= edgeThreshold,
      isNearRightEdge: initialX >= (window.innerWidth - edgeThreshold),
      lastMoved: Date.now()
    });

    return () => {
      document.removeEventListener('mousemove', debouncedUpdateMousePosition);
      logger.debug('🖱️ useMousePosition: Event listener removed', {
        timestamp: new Date().toISOString()
      });
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [edgeThreshold]);

  return mousePosition;
}