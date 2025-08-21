import { useCallback, useRef, useState } from 'react';

export const useTapTempo = () => {
  const [bpm, setBpm] = useState<number | null>(null);
  const [taps, setTaps] = useState<number[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const tap = useCallback(() => {
    const now = Date.now();
    
    // 前回のタップから3秒以上経過していたらリセット
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    setTaps(prevTaps => {
      const newTaps = [...prevTaps, now];
      
      // 最新の8タップのみ保持
      const recentTaps = newTaps.slice(-8);
      
      // 2タップ以上でBPM計算
      if (recentTaps.length >= 2) {
        const intervals = [];
        for (let i = 1; i < recentTaps.length; i++) {
          intervals.push(recentTaps[i] - recentTaps[i - 1]);
        }
        
        // 平均間隔からBPM計算
        const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
        const calculatedBpm = Math.round(60000 / avgInterval);
        
        // 有効なBPM範囲内であれば設定
        if (calculatedBpm >= 30 && calculatedBpm <= 300) {
          setBpm(calculatedBpm);
        }
      }
      
      return recentTaps;
    });
    
    // 3秒後にリセット
    timeoutRef.current = setTimeout(() => {
      setTaps([]);
      setBpm(null);
    }, 3000);
  }, []);

  const reset = useCallback(() => {
    setTaps([]);
    setBpm(null);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  return {
    bpm,
    tapCount: taps.length,
    tap,
    reset
  };
};