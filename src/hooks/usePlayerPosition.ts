'use client';

import { useEffect, useState, useRef, RefObject, useCallback } from 'react';
import { logger } from '@/lib/utils/logger';

export interface PlayerPosition {
  isVisible: boolean;
  isInUpperArea: boolean;
  rect: DOMRect | null;
  scrollY: number;
}

export interface UsePlayerPositionReturn {
  playerPosition: PlayerPosition;
  popupPosition: 'left' | 'right';
  shouldHidePopup: boolean;
}

/**
 * プレイヤーの位置とスクロール状態を監視し、
 * ポップアップの最適な位置を決定するカスタムフック
 */
export function usePlayerPosition(
  playerContainerRef: RefObject<HTMLElement | null>
): UsePlayerPositionReturn {
  const [playerPosition, setPlayerPosition] = useState<PlayerPosition>({
    isVisible: false,
    isInUpperArea: false,
    rect: null,
    scrollY: 0
  });

  const [popupPosition, setPopupPosition] = useState<'left' | 'right'>('left');
  const [shouldHidePopup, setShouldHidePopup] = useState<boolean>(false);
  const lastUpdateTime = useRef<number>(0);
  const requestRef = useRef<number | null>(null);

  const updatePlayerPosition = useCallback(() => {
    const now = performance.now();
    
    // デバウンス処理（16ms間隔でスロットル）
    if (now - lastUpdateTime.current < 16) {
      return;
    }
    lastUpdateTime.current = now;

    if (!playerContainerRef.current) {
      setPlayerPosition({
        isVisible: false,
        isInUpperArea: false,
        rect: null,
        scrollY: window.scrollY
      });
      setPopupPosition('left');
      return;
    }

    const rect = playerContainerRef.current.getBoundingClientRect();
    const scrollY = window.scrollY;
    const windowHeight = window.innerHeight;

    // プレイヤーがビューポート内に見えているかチェック
    const isVisible = rect.bottom > 0 && rect.top < windowHeight;
    
    // プレイヤーが画面上部200px以内にあるかチェック
    const isInUpperArea = rect.top <= 200 && rect.bottom > 0;

    const newPlayerPosition: PlayerPosition = {
      isVisible,
      isInUpperArea,
      rect,
      scrollY
    };

    setPlayerPosition(newPlayerPosition);

    // ポップアップの位置と表示/非表示を決定（改良版）
    const isMobile = window.innerWidth < 768; // md breakpoint
    const viewportHeight = window.innerHeight;
    const playerCenterY = rect.top + rect.height / 2;
    
    // プレイヤーがかなり大きな範囲を占有している場合は非表示
    const playerOccupiesLargeArea = isVisible && rect.height > viewportHeight * 0.6;
    
    // プレイヤーが画面の大部分（左右50%以上）を占める場合も非表示
    const playerOccupiesWideArea = isVisible && rect.width > window.innerWidth * 0.8;
    
    // プレイヤーが中央の広範囲にある場合は非表示にする
    const playerInLargeCenterArea = isVisible && 
      playerCenterY > viewportHeight * 0.2 && 
      playerCenterY < viewportHeight * 0.8 && 
      rect.height > viewportHeight * 0.3;
    
    if (playerOccupiesLargeArea || playerOccupiesWideArea || playerInLargeCenterArea) {
      // プレイヤーが大きすぎる、または中央の広範囲を占める場合は非表示
      setShouldHidePopup(true);
      setPopupPosition('right'); // デフォルト位置は保持
    } else {
      setShouldHidePopup(false);
      
      if (isMobile) {
        // モバイルでは常に左側に固定
        setPopupPosition('left');
      } else {
        // デスクトップでは基本的に右側を使用
        // プレイヤーが画面中央付近（上から30%-70%の範囲）にある場合のみ左側に移動
        const playerInCenterArea = playerCenterY > viewportHeight * 0.3 && playerCenterY < viewportHeight * 0.7;
        
        if (isVisible && playerInCenterArea && !playerInLargeCenterArea) {
          // プレイヤーが画面中央付近にあるが、大きすぎない場合は左側に表示
          setPopupPosition('left');
        } else {
          // プレイヤーが上部、下部、または非表示の場合は右側に表示
          setPopupPosition('right');
        }
      }
    }

    logger.debug('Player position updated', {
      isVisible,
      isInUpperArea,
      popupPosition: isMobile ? 'left (mobile)' : (isVisible && isInUpperArea ? 'right' : 'left'),
      playerTop: rect.top,
      playerBottom: rect.bottom,
      scrollY,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      upperAreaThreshold: 200,
      playerRect: {
        top: rect.top,
        bottom: rect.bottom,
        left: rect.left,
        right: rect.right,
        width: rect.width,
        height: rect.height
      }
    });

    // プロダクション環境でも位置情報をコンソールに出力（非表示判定追加版）
    const playerInCenterArea = playerCenterY > viewportHeight * 0.3 && playerCenterY < viewportHeight * 0.7;
    const finalPosition = isMobile ? 'left (mobile)' : (isVisible && playerInCenterArea && !playerInLargeCenterArea ? 'left' : 'right');
    
    console.log('🎯 Player Position Debug:', {
      isVisible,
      isInUpperArea,
      playerInCenterArea,
      playerInLargeCenterArea,
      playerOccupiesLargeArea,
      playerOccupiesWideArea,
      shouldHidePopup: playerOccupiesLargeArea || playerOccupiesWideArea || playerInLargeCenterArea,
      finalPosition,
      playerTop: Math.round(rect.top),
      playerCenterY: Math.round(playerCenterY),
      playerSize: `${Math.round(rect.width)}x${Math.round(rect.height)}`,
      centerAreaRange: `${Math.round(viewportHeight * 0.3)}-${Math.round(viewportHeight * 0.7)}px`,
      scrollY: Math.round(scrollY),
      windowSize: `${window.innerWidth}x${window.innerHeight}`,
      isMobile
    });
  }, [playerContainerRef]);

  useEffect(() => {
    // 初回実行
    updatePlayerPosition();

    const handleScroll = () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      requestRef.current = requestAnimationFrame(updatePlayerPosition);
    };

    const handleResize = () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      requestRef.current = requestAnimationFrame(updatePlayerPosition);
    };

    // イベントリスナー登録
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });

    // 定期的な更新（レイアウトの変更を検出）
    const intervalId = setInterval(updatePlayerPosition, 1000);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      clearInterval(intervalId);
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [updatePlayerPosition, playerContainerRef]);

  return {
    playerPosition,
    popupPosition,
    shouldHidePopup
  };
}