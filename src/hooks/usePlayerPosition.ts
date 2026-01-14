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
    }
    setLastScrollY(scrollY);

    // Position is fixed until user scrolls significantly
    const isPositionFixed = fixedPosition !== null;

    // ポップアップの位置と表示/非表示を決定（位置固定機能付きマウス回避）
    const isMobile = window.innerWidth < 768; // md breakpoint
    const viewportHeight = window.innerHeight;
    
    // プレイヤーとポップアップの実際の衝突判定
    // ポップアップの実際の座標を計算（下部表示用）
    const popupWidth = 320; // ポップアップの幅（推定値）
    const popupHeight = 100; // ポップアップの高さ（推定値）
    const popupBottom = 16; // bottom: 1rem = 16px
    const popupMargin = 16; // left/right: 1rem = 16px

    // ポップアップの矩形領域を計算
    const popupRect = {
      left: popupPosition === 'left' ? popupMargin : window.innerWidth - popupMargin - popupWidth,
      right: popupPosition === 'left' ? popupMargin + popupWidth : window.innerWidth - popupMargin,
      top: window.innerHeight - popupBottom - popupHeight,
      bottom: window.innerHeight - popupBottom
    };

    // プレイヤーとポップアップの矩形が重複するかチェック
    const hasRectangleOverlap = isVisible && !(
      rect.right < popupRect.left ||   // プレイヤーがポップアップの左側
      rect.left > popupRect.right ||   // プレイヤーがポップアップの右側
      rect.bottom < popupRect.top ||   // プレイヤーがポップアップの上側
      rect.top > popupRect.bottom      // プレイヤーがポップアップの下側
    );

    // プレイヤーがポップアップ表示領域に侵入している場合
    const popupZoneHeight = popupHeight + popupBottom; // 100px + 16px = 116px
    const playerInPopupZone = isVisible && rect.bottom > viewportHeight - popupZoneHeight;
    
    // プレイヤーがフルスクリーンまたはほぼ全画面の場合は非表示
    const playerIsFullscreen = isVisible && 
      rect.width > window.innerWidth * 0.995 && // (98% → 99.5%に緩和)
      rect.height > viewportHeight * 0.995;
    
    // マウス位置に基づく衝突検出と回避ロジック
    // 左と右のポップアップ位置での矩形を計算（マウス回避用）
    const leftPopupRect = {
      left: popupMargin,
      right: popupMargin + popupWidth,
      top: window.innerHeight - popupBottom - popupHeight,
      bottom: window.innerHeight - popupBottom
    };

    const rightPopupRect = {
      left: window.innerWidth - popupMargin - popupWidth,
      right: window.innerWidth - popupMargin,
      top: window.innerHeight - popupBottom - popupHeight,
      bottom: window.innerHeight - popupBottom
    };
    
    // マウスがポップアップ領域に近いかチェック（マージン100px）
    const mouseBuffer = 100;

    // 精密な距離計算
    const distanceToLeftPopup = {
      horizontal: Math.max(0,
        Math.max(leftPopupRect.left - mousePosition.x, mousePosition.x - leftPopupRect.right)
      ),
      vertical: Math.max(0,
        Math.max(leftPopupRect.top - mousePosition.y, mousePosition.y - leftPopupRect.bottom)
      ),
      // 矩形の最も近い点までの距離
      get closest() {
        return Math.sqrt(this.horizontal * this.horizontal + this.vertical * this.vertical);
      }
    };

    const distanceToRightPopup = {
      horizontal: Math.max(0,
        Math.max(rightPopupRect.left - mousePosition.x, mousePosition.x - rightPopupRect.right)
      ),
      vertical: Math.max(0,
        Math.max(rightPopupRect.top - mousePosition.y, mousePosition.y - rightPopupRect.bottom)
      ),
      // 矩形の最も近い点までの距離
      get closest() {
        return Math.sqrt(this.horizontal * this.horizontal + this.vertical * this.vertical);
      }
    };

    const isMouseNearLeftPopup = mousePosition.x >= (leftPopupRect.left - mouseBuffer) &&
                                 mousePosition.x <= (leftPopupRect.right + mouseBuffer) &&
                                 mousePosition.y >= (leftPopupRect.top - mouseBuffer) &&
                                 mousePosition.y <= (leftPopupRect.bottom + mouseBuffer);

    const isMouseNearRightPopup = mousePosition.x >= (rightPopupRect.left - mouseBuffer) &&
                                  mousePosition.x <= (rightPopupRect.right + mouseBuffer) &&
                                  mousePosition.y >= (rightPopupRect.top - mouseBuffer) &&
                                  mousePosition.y <= (rightPopupRect.bottom + mouseBuffer);
    
    if (hasRectangleOverlap || playerInPopupZone || playerIsFullscreen) {
      // プレイヤーがポップアップ領域に侵入、またはフルスクリーンの場合は非表示
      setShouldHidePopup(true);
      setPopupPosition('right'); // デフォルト位置は保持
      setIsMouseNearPopup(false);
      setMouseAvoidanceActive(false);
    } else {
      setShouldHidePopup(false);
      
      // マウス衝突状態を更新
      const currentMouseNear = isMouseNearLeftPopup || isMouseNearRightPopup;
      setIsMouseNearPopup(currentMouseNear);
      
      // Dynamic mouse avoidance logic - always check mouse position even if previously fixed
      if (isMobile) {
        // モバイルでも右下固定ベース（デスクトップと統一）
        let finalPosition: 'left' | 'right' = 'right'; // デフォルトは右下
        let avoidanceActive = false;

        // マウス回避ロジック（タッチ操作も考慮）- 動的切り替え
        if (isMouseNearRightPopup) {
          finalPosition = 'left';
          avoidanceActive = true;
          setFixedPosition(finalPosition); // 現在の選択を記録（デバッグ用）
        } else if (isMouseNearLeftPopup) {
          // 左側でマウスが被る場合は右側に戻す
          finalPosition = 'right';
          avoidanceActive = true;
          setFixedPosition(finalPosition); // 現在の選択を記録（デバッグ用）
        } else {
          // マウスがポップアップから離れた場合はデフォルト位置（右下）に戻る
          finalPosition = 'right';
          avoidanceActive = false;
          setFixedPosition(null); // 固定解除
        }

        setPopupPosition(finalPosition);
        setMouseAvoidanceActive(avoidanceActive);
      } else {
        // デスクトップでのポジション決定ロジック（右下固定ベース）
        // 基本は右下で、マウス回避のみで左下に切り替え - 動的切り替え
        let finalPosition: 'left' | 'right' = 'right'; // デフォルトは右下
        let avoidanceActive = false;

        // マウス回避ロジック - 動的切り替え
        if (isMouseNearRightPopup) {
          // 右下でマウスが被る場合、左下に移動
          finalPosition = 'left';
          avoidanceActive = true;
          setFixedPosition(finalPosition); // 現在の選択を記録（デバッグ用）
        } else if (isMouseNearLeftPopup) {
          // 左下でマウスが被る場合、右下に戻す
          finalPosition = 'right';
          avoidanceActive = true;
          setFixedPosition(finalPosition); // 現在の選択を記録（デバッグ用）
        }

        // マウスが画面端にいる場合の強制回避
        if (mousePosition.isNearRightEdge && (finalPosition === 'right' || isMouseNearRightPopup)) {
          finalPosition = 'left';
          avoidanceActive = true;
          setFixedPosition(finalPosition); // 現在の選択を記録（デバッグ用）
        } else if (mousePosition.isNearLeftEdge && (finalPosition === 'left' || isMouseNearLeftPopup)) {
          finalPosition = 'right';
          avoidanceActive = true;
          setFixedPosition(finalPosition); // 現在の選択を記録（デバッグ用）
        }

        // マウスがすべてのポップアップと画面端から離れた場合はデフォルト位置に戻る
        if (!isMouseNearRightPopup && !isMouseNearLeftPopup &&
            !mousePosition.isNearRightEdge && !mousePosition.isNearLeftEdge) {
          finalPosition = 'right'; // デフォルトは右下
          avoidanceActive = false;
          setFixedPosition(null); // 固定解除
        }

        setPopupPosition(finalPosition);
        setMouseAvoidanceActive(avoidanceActive);
      }
    }

    logger.debug('Player position updated', {
      isVisible,
      isInUpperArea,
      popupPosition: `${popupPosition} (dynamic-avoidance)`,
      playerTop: rect.top,
      playerBottom: rect.bottom,
      scrollY,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      playerRect: {
        top: rect.top,
        bottom: rect.bottom,
        left: rect.left,
        right: rect.right,
        width: rect.width,
        height: rect.height
      }
    });

    // プロダクション環境でも位置情報をコンソールに出力（右下固定ベース）
    
    // プロダクション環境専用デバッグ出力（logger.debugは本番で出力されないため）
    logger.debug('🎯 Player Position Debug (Dynamic Mouse Avoidance):', {
      isVisible,
      isInUpperArea,
      collisionDetection: {
        hasRectangleOverlap,
        playerInPopupZone,
        playerIsFullscreen,
        shouldHidePopup: hasRectangleOverlap || playerInPopupZone || playerIsFullscreen,
        // 境界条件の詳細検証
        overlapDetails: {
          playerLeftOfPopup: rect.right < popupRect.left,
          playerRightOfPopup: rect.left > popupRect.right,
          playerAbovePopup: rect.bottom < popupRect.top,
          playerBelowPopup: rect.top > popupRect.bottom,
          // 接触・重複の境界値
          horizontalOverlap: Math.max(0, Math.min(rect.right, popupRect.right) - Math.max(rect.left, popupRect.left)),
          verticalOverlap: Math.max(0, Math.min(rect.bottom, popupRect.bottom) - Math.max(rect.top, popupRect.top)),
          // ポップアップ領域侵入の詳細
          distanceFromBottom: Math.round(viewportHeight - rect.bottom),
          popupZoneHeight: popupZoneHeight,
          popupZoneTop: Math.round(viewportHeight - popupZoneHeight),
          isInPopupZone: rect.bottom > viewportHeight - popupZoneHeight,
          playerHeightRatio: Math.round((rect.height / viewportHeight) * 100) / 100
        }
      },
      playerRect: {
        top: Math.round(rect.top),
        bottom: Math.round(rect.bottom),
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      },
      popupRect: {
        position: popupPosition,
        top: Math.round(popupRect.top),
        bottom: Math.round(popupRect.bottom),
        left: Math.round(popupRect.left),
        right: Math.round(popupRect.right),
        width: popupWidth,
        height: popupHeight,
        // 座標計算の検証
        calculationVerification: {
          leftPosition: popupPosition === 'left' ? `${popupMargin}px from left` : `${window.innerWidth - popupMargin - popupWidth}px from left`,
          rightPosition: popupPosition === 'left' ? `${popupMargin + popupWidth}px from left` : `${window.innerWidth - popupMargin}px from left`,
          bottomFromViewport: `${popupBottom}px from bottom`,
          topFromViewport: `${window.innerHeight - popupBottom - popupHeight}px from top`,
          // 画面サイズに対する相対位置
          relativeX: popupPosition === 'left' ?
            Math.round((popupMargin / window.innerWidth) * 100) + '%' :
            Math.round(((window.innerWidth - popupMargin - popupWidth) / window.innerWidth) * 100) + '%',
          relativeY: Math.round(((window.innerHeight - popupBottom - popupHeight) / window.innerHeight) * 100) + '%'
        }
      },
      popupPosition: `${popupPosition} (dynamic-avoidance)`,
      mouseAvoidanceActive: mouseAvoidanceActive,
      isMouseNearPopup: isMouseNearLeftPopup || isMouseNearRightPopup,
      isPositionFixed: isPositionFixed,
      fixedPosition: fixedPosition,
      fixedUntilScroll: isPositionFixed ? 'until scroll (100px+)' : 'none',
      mousePosition: {
        x: Math.round(mousePosition.x),
        y: Math.round(mousePosition.y),
        isNearLeftEdge: mousePosition.isNearLeftEdge,
        isNearRightEdge: mousePosition.isNearRightEdge
      },
      isMouseNearLeftPopup,
      isMouseNearRightPopup,
      // 詳細なマウス衝突判定情報
      mouseCollisionDetails: {
        leftPopupDistance: {
          horizontal: Math.round(distanceToLeftPopup.horizontal),
          vertical: Math.round(distanceToLeftPopup.vertical),
          closest: Math.round(distanceToLeftPopup.closest),
          withinBuffer: distanceToLeftPopup.closest <= mouseBuffer,
          bufferOverlap: Math.max(0, mouseBuffer - distanceToLeftPopup.closest)
        },
        rightPopupDistance: {
          horizontal: Math.round(distanceToRightPopup.horizontal),
          vertical: Math.round(distanceToRightPopup.vertical),
          closest: Math.round(distanceToRightPopup.closest),
          withinBuffer: distanceToRightPopup.closest <= mouseBuffer,
          bufferOverlap: Math.max(0, mouseBuffer - distanceToRightPopup.closest)
        },
        edgeDetection: {
          leftEdgeDistance: Math.round(mousePosition.x),
          rightEdgeDistance: Math.round(window.innerWidth - mousePosition.x),
          leftEdgeThreshold: 150,
          rightEdgeThreshold: 150,
          isNearLeftEdge: mousePosition.isNearLeftEdge,
          isNearRightEdge: mousePosition.isNearRightEdge,
          // 境界条件の詳細
          boundaryValidation: {
            leftEdgeExact: mousePosition.x === 150,
            leftEdgeInside: mousePosition.x < 150,
            leftEdgeOutside: mousePosition.x > 150,
            rightEdgeExact: mousePosition.x === (window.innerWidth - 150),
            rightEdgeInside: mousePosition.x > (window.innerWidth - 150),
            rightEdgeOutside: mousePosition.x < (window.innerWidth - 150)
          }
        },
        bufferZoneValidation: {
          mouseBuffer: mouseBuffer,
          leftPopupCenter: {
            x: Math.round((leftPopupRect.left + leftPopupRect.right) / 2),
            y: Math.round((leftPopupRect.top + leftPopupRect.bottom) / 2)
          },
          rightPopupCenter: {
            x: Math.round((rightPopupRect.left + rightPopupRect.right) / 2),
            y: Math.round((rightPopupRect.top + rightPopupRect.bottom) / 2)
          },
          // バッファゾーンの境界テスト
          leftBufferBoundary: {
            top: leftPopupRect.top - mouseBuffer,
            bottom: leftPopupRect.bottom + mouseBuffer,
            left: leftPopupRect.left - mouseBuffer,
            right: leftPopupRect.right + mouseBuffer,
            mouseAtBoundary: {
              top: Math.abs(mousePosition.y - (leftPopupRect.top - mouseBuffer)) < 1,
              bottom: Math.abs(mousePosition.y - (leftPopupRect.bottom + mouseBuffer)) < 1,
              left: Math.abs(mousePosition.x - (leftPopupRect.left - mouseBuffer)) < 1,
              right: Math.abs(mousePosition.x - (leftPopupRect.right + mouseBuffer)) < 1
            }
          },
          rightBufferBoundary: {
            top: rightPopupRect.top - mouseBuffer,
            bottom: rightPopupRect.bottom + mouseBuffer,
            left: rightPopupRect.left - mouseBuffer,
            right: rightPopupRect.right + mouseBuffer,
            mouseAtBoundary: {
              top: Math.abs(mousePosition.y - (rightPopupRect.top - mouseBuffer)) < 1,
              bottom: Math.abs(mousePosition.y - (rightPopupRect.bottom + mouseBuffer)) < 1,
              left: Math.abs(mousePosition.x - (rightPopupRect.left - mouseBuffer)) < 1,
              right: Math.abs(mousePosition.x - (rightPopupRect.right + mouseBuffer)) < 1
            }
          }
        },
        positionSwitchingLogic: {
          currentPosition: popupPosition,
          isDynamicAvoidance: fixedPosition !== null, // 現在回避中かどうか
          lastAvoidancePosition: fixedPosition, // 最後に回避した位置（デバッグ用）
          mouseAvoidanceReason: mouseAvoidanceActive ? (
            isMouseNearRightPopup && popupPosition === 'left' ? 'avoiding-right-popup' :
            isMouseNearLeftPopup && popupPosition === 'right' ? 'avoiding-left-popup' :
            mousePosition.isNearRightEdge && popupPosition === 'left' ? 'avoiding-right-edge' :
            mousePosition.isNearLeftEdge && popupPosition === 'right' ? 'avoiding-left-edge' :
            'unknown-avoidance'
          ) : 'no-avoidance',
          // 動的位置切り替えの状態
          dynamicSwitching: {
            wouldSwitchToLeft: isMouseNearRightPopup || (mousePosition.isNearRightEdge && !isMouseNearLeftPopup),
            wouldSwitchToRight: isMouseNearLeftPopup || (mousePosition.isNearLeftEdge && !isMouseNearRightPopup),
            wouldReturnToDefault: !isMouseNearRightPopup && !isMouseNearLeftPopup && !mousePosition.isNearRightEdge && !mousePosition.isNearLeftEdge,
            currentlyAvoiding: mouseAvoidanceActive
          }
        }
      },
      thresholds: {
        popupZoneLimit: Math.round(viewportHeight - popupZoneHeight),
        popupZoneHeight: popupZoneHeight,
        fullscreenWidthLimit: Math.round(window.innerWidth * 0.995),
        fullscreenHeightLimit: Math.round(viewportHeight * 0.995)
      },
      scrollY: Math.round(scrollY),
      windowSize: `${window.innerWidth}x${window.innerHeight}`,
      isMobile
    });
  }, [playerContainerRef, mousePosition, mouseAvoidanceActive, popupPosition, fixedPosition, lastScrollY]);

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
    isPositionFixed: fixedPosition !== null
  };
}