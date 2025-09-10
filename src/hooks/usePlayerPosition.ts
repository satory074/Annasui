'use client';

import { useEffect, useState, useRef, RefObject, useCallback } from 'react';
import { logger } from '@/lib/utils/logger';
import { useMousePosition } from './useMousePosition';

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
  isMouseNearPopup: boolean;
  mouseAvoidanceActive: boolean;
  isPositionFixed: boolean;
}

// Position fixing constants
const POSITION_FIX_DURATION = 4000; // 4 seconds
const SIGNIFICANT_SCROLL_THRESHOLD = 100; // pixels

/**
 * プレイヤーの位置とスクロール状態を監視し、
 * マウス位置も考慮してポップアップの最適な位置を決定するカスタムフック
 * マウス回避後は一定時間位置を固定する機能付き
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
  const [isMouseNearPopup, setIsMouseNearPopup] = useState<boolean>(false);
  const [mouseAvoidanceActive, setMouseAvoidanceActive] = useState<boolean>(false);
  
  // Position fixing state
  const [fixedPosition, setFixedPosition] = useState<'left' | 'right' | null>(null);
  const [positionFixedUntil, setPositionFixedUntil] = useState<number>(0);
  const [lastScrollY, setLastScrollY] = useState<number>(0);
  
  const lastUpdateTime = useRef<number>(0);
  const requestRef = useRef<number | null>(null);
  
  // マウス位置を監視（画面端から150px以内を検出）
  const mousePosition = useMousePosition(150);

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

    // Check if user scrolled significantly (clear position fixing)
    const scrollDelta = Math.abs(scrollY - lastScrollY);
    if (scrollDelta > SIGNIFICANT_SCROLL_THRESHOLD) {
      setFixedPosition(null);
      setPositionFixedUntil(0);
    }
    setLastScrollY(scrollY);

    // Check if position fix has expired
    const currentTime = Date.now();
    const isPositionFixed = fixedPosition !== null && currentTime < positionFixedUntil;

    // ポップアップの位置と表示/非表示を決定（位置固定機能付きマウス回避）
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
    
    // マウス位置に基づく衝突検出と回避ロジック
    const popupWidth = 320; // ポップアップの幅（推定値）
    const popupHeight = 100; // ポップアップの高さ（推定値）
    const popupTop = 96; // top: 6rem = 96px
    const popupLeft = 16; // left: 1rem = 16px
    const popupRight = 16; // right: 1rem = 16px
    
    // 現在のポップアップ位置での矩形を計算
    const leftPopupRect = {
      left: popupLeft,
      right: popupLeft + popupWidth,
      top: popupTop,
      bottom: popupTop + popupHeight
    };
    
    const rightPopupRect = {
      left: window.innerWidth - popupRight - popupWidth,
      right: window.innerWidth - popupRight,
      top: popupTop,
      bottom: popupTop + popupHeight
    };
    
    // マウスがポップアップ領域に近いかチェック（マージン100px）
    const mouseBuffer = 100;
    const isMouseNearLeftPopup = mousePosition.x >= (leftPopupRect.left - mouseBuffer) && 
                                 mousePosition.x <= (leftPopupRect.right + mouseBuffer) &&
                                 mousePosition.y >= (leftPopupRect.top - mouseBuffer) &&
                                 mousePosition.y <= (leftPopupRect.bottom + mouseBuffer);
                                 
    const isMouseNearRightPopup = mousePosition.x >= (rightPopupRect.left - mouseBuffer) && 
                                  mousePosition.x <= (rightPopupRect.right + mouseBuffer) &&
                                  mousePosition.y >= (rightPopupRect.top - mouseBuffer) &&
                                  mousePosition.y <= (rightPopupRect.bottom + mouseBuffer);
    
    if (playerOccupiesLargeArea || playerOccupiesWideArea || playerInLargeCenterArea) {
      // プレイヤーが大きすぎる、または中央の広範囲を占める場合は非表示
      setShouldHidePopup(true);
      setPopupPosition('right'); // デフォルト位置は保持
      setIsMouseNearPopup(false);
      setMouseAvoidanceActive(false);
    } else {
      setShouldHidePopup(false);
      
      // マウス衝突状態を更新
      const currentMouseNear = isMouseNearLeftPopup || isMouseNearRightPopup;
      setIsMouseNearPopup(currentMouseNear);
      
      // If position is currently fixed, use the fixed position
      if (isPositionFixed && fixedPosition) {
        setPopupPosition(fixedPosition);
        // Check if we should still show avoidance styling
        const isCurrentPositionBeingAvoided = 
          (fixedPosition === 'left' && isMouseNearLeftPopup) ||
          (fixedPosition === 'right' && isMouseNearRightPopup);
        setMouseAvoidanceActive(isCurrentPositionBeingAvoided);
      } else if (isMobile) {
        // モバイルでは基本的に左側だが、マウスが被る場合は右側に移動
        if (isMouseNearLeftPopup) {
          const newPosition = 'right';
          setPopupPosition(newPosition);
          setMouseAvoidanceActive(true);
          // Set position fixing when avoiding mouse
          setFixedPosition(newPosition);
          setPositionFixedUntil(currentTime + POSITION_FIX_DURATION);
        } else {
          const newPosition = 'left';
          setPopupPosition(newPosition);
          setMouseAvoidanceActive(isMouseNearRightPopup);
          // Set position fixing if avoiding mouse on right
          if (isMouseNearRightPopup) {
            setFixedPosition(newPosition);
            setPositionFixedUntil(currentTime + POSITION_FIX_DURATION);
          }
        }
      } else {
        // デスクトップでのポジション決定ロジック
        const playerInCenterArea = playerCenterY > viewportHeight * 0.3 && playerCenterY < viewportHeight * 0.7;
        
        // 基本のポジション（プレイヤー位置ベース）
        let basePosition: 'left' | 'right';
        if (isVisible && playerInCenterArea && !playerInLargeCenterArea) {
          basePosition = 'left';
        } else {
          basePosition = 'right';
        }
        
        // マウス回避ロジックを適用
        let finalPosition = basePosition;
        let avoidanceActive = false;
        
        if (basePosition === 'left' && isMouseNearLeftPopup) {
          // 左側にいるがマウスが被る場合、右側に移動
          finalPosition = 'right';
          avoidanceActive = true;
          // Set position fixing when avoiding mouse
          setFixedPosition(finalPosition);
          setPositionFixedUntil(currentTime + POSITION_FIX_DURATION);
        } else if (basePosition === 'right' && isMouseNearRightPopup) {
          // 右側にいるがマウスが被る場合、左側に移動
          finalPosition = 'left';
          avoidanceActive = true;
          // Set position fixing when avoiding mouse
          setFixedPosition(finalPosition);
          setPositionFixedUntil(currentTime + POSITION_FIX_DURATION);
        }
        
        // マウスが画面端にいる場合の強制回避
        if (mousePosition.isNearLeftEdge && (finalPosition === 'left' || isMouseNearLeftPopup)) {
          finalPosition = 'right';
          avoidanceActive = true;
          // Set position fixing for edge avoidance
          setFixedPosition(finalPosition);
          setPositionFixedUntil(currentTime + POSITION_FIX_DURATION);
        } else if (mousePosition.isNearRightEdge && (finalPosition === 'right' || isMouseNearRightPopup)) {
          finalPosition = 'left';
          avoidanceActive = true;
          // Set position fixing for edge avoidance
          setFixedPosition(finalPosition);
          setPositionFixedUntil(currentTime + POSITION_FIX_DURATION);
        }
        
        setPopupPosition(finalPosition);
        setMouseAvoidanceActive(avoidanceActive);
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

    // プロダクション環境でも位置情報をコンソールに出力（位置固定機能追加版）
    const playerInCenterArea = playerCenterY > viewportHeight * 0.3 && playerCenterY < viewportHeight * 0.7;
    
    logger.debug('🎯 Player Position Debug (with Position Fixing):', {
      isVisible,
      isInUpperArea,
      playerInCenterArea,
      playerInLargeCenterArea,
      playerOccupiesLargeArea,
      playerOccupiesWideArea,
      shouldHidePopup: playerOccupiesLargeArea || playerOccupiesWideArea || playerInLargeCenterArea,
      popupPosition: popupPosition,
      mouseAvoidanceActive: mouseAvoidanceActive,
      isMouseNearPopup: isMouseNearLeftPopup || isMouseNearRightPopup,
      isPositionFixed: isPositionFixed,
      fixedPosition: fixedPosition,
      positionFixedUntil: positionFixedUntil > 0 ? new Date(positionFixedUntil).toLocaleTimeString() : 'none',
      timeUntilFixExpires: positionFixedUntil > 0 ? Math.max(0, Math.round((positionFixedUntil - currentTime) / 1000)) + 's' : 'none',
      mousePosition: {
        x: Math.round(mousePosition.x),
        y: Math.round(mousePosition.y),
        isNearLeftEdge: mousePosition.isNearLeftEdge,
        isNearRightEdge: mousePosition.isNearRightEdge
      },
      isMouseNearLeftPopup,
      isMouseNearRightPopup,
      playerTop: Math.round(rect.top),
      playerCenterY: Math.round(playerCenterY),
      playerSize: `${Math.round(rect.width)}x${Math.round(rect.height)}`,
      centerAreaRange: `${Math.round(viewportHeight * 0.3)}-${Math.round(viewportHeight * 0.7)}px`,
      scrollY: Math.round(scrollY),
      windowSize: `${window.innerWidth}x${window.innerHeight}`,
      isMobile
    });
  }, [playerContainerRef, mousePosition, mouseAvoidanceActive, popupPosition, fixedPosition, lastScrollY, positionFixedUntil]);

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
    shouldHidePopup,
    isMouseNearPopup,
    mouseAvoidanceActive,
    isPositionFixed: fixedPosition !== null && Date.now() < positionFixedUntil
  };
}