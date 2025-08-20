import React, { useState, useRef, useCallback } from 'react';
import { TempoChange } from '../../../types/features/medley';

interface TempoTrackProps {
  duration: number;
  currentTime: number;
  initialBpm: number;
  tempoChanges: TempoChange[];
  visibleStartTime: number;
  visibleDuration: number;
  timelineZoom: number;
  onUpdateTempo?: (initialBpm: number, tempoChanges: TempoChange[]) => void;
  isEditMode: boolean;
}

export const TempoTrack: React.FC<TempoTrackProps> = ({
  currentTime,
  initialBpm,
  tempoChanges,
  visibleStartTime,
  visibleDuration,
  onUpdateTempo,
  isEditMode
}) => {
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    dragIndex: number | null;
    dragType: 'time' | 'bpm' | null;
    startX: number;
    startY: number;
  }>({
    isDragging: false,
    dragIndex: null,
    dragType: null,
    startX: 0,
    startY: 0
  });
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const visibleEndTime = visibleStartTime + visibleDuration;

  // 動的BPM範囲を計算
  const getAllBpms = () => [initialBpm, ...tempoChanges.map(tc => tc.bpm)];
  const getMinBpm = () => Math.min(...getAllBpms()) - 10;
  const getMaxBpm = () => Math.max(...getAllBpms()) + 10;
  const getBpmRange = () => getMaxBpm() - getMinBpm();


  // 座標をBPM値に変換
  const yToBpm = useCallback((y: number): number => {
    if (!trackRef.current) return initialBpm;
    const rect = trackRef.current.getBoundingClientRect();
    const relativeY = y - rect.top;
    const percentage = 1 - (relativeY / rect.height);
    const minBpm = getMinBpm();
    const bpmRange = getBpmRange();
    return minBpm + (percentage * bpmRange);
  }, [initialBpm, tempoChanges, getMinBpm, getBpmRange]);

  // 座標を時間に変換
  const xToTime = useCallback((x: number): number => {
    if (!trackRef.current) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    const relativeX = x - rect.left;
    const percentage = relativeX / rect.width;
    return visibleStartTime + (percentage * visibleDuration);
  }, [visibleStartTime, visibleDuration]);

  // BPM値をY座標に変換（SVG座標系）
  const bpmToY = (bpm: number): number => {
    return 100 - ((bpm - getMinBpm()) / getBpmRange()) * 100;
  };

  // 時間をX座標に変換（SVG座標系）
  const timeToX = (time: number): number => {
    return ((time - visibleStartTime) / visibleDuration) * 100;
  };

  // テンポ変更点を追加
  const handleTrackClick = useCallback((e: React.MouseEvent) => {
    if (!isEditMode || !onUpdateTempo || dragState.isDragging) return;

    const time = Math.max(0.1, Math.round(xToTime(e.clientX) * 10) / 10);
    const bpm = Math.max(30, Math.min(300, Math.round(yToBpm(e.clientY))));

    // 既存の変更点と重複しないかチェック
    const existingChange = tempoChanges.find(tc => Math.abs(tc.time - time) < 0.1);
    if (existingChange) return;

    const newTempoChange: TempoChange = { time, bpm };
    const updatedChanges = [...tempoChanges, newTempoChange];
    onUpdateTempo(initialBpm, updatedChanges);
  }, [isEditMode, onUpdateTempo, dragState.isDragging, tempoChanges, initialBpm, xToTime, yToBpm]);

  // テンポ変更点のダブルクリック編集
  const handleTempoPointDoubleClick = useCallback((e: React.MouseEvent, index: number) => {
    if (!isEditMode || !onUpdateTempo) return;
    e.stopPropagation();

    const currentChange = tempoChanges[index];
    const newBpm = prompt('新しいBPM値を入力してください:', currentChange.bpm.toString());
    if (!newBpm || isNaN(parseFloat(newBpm))) return;

    const bpm = Math.max(30, Math.min(300, parseFloat(newBpm)));
    const updatedChanges = tempoChanges.map((tc, i) => 
      i === index ? { ...tc, bpm } : tc
    );
    
    onUpdateTempo(initialBpm, updatedChanges);
  }, [isEditMode, onUpdateTempo, tempoChanges, initialBpm]);

  // テンポ変更点の削除
  const handleTempoPointRightClick = useCallback((e: React.MouseEvent, index: number) => {
    if (!isEditMode || !onUpdateTempo) return;
    e.preventDefault();
    e.stopPropagation();

    if (confirm('このテンポ変更点を削除しますか？')) {
      const updatedChanges = tempoChanges.filter((_, i) => i !== index);
      onUpdateTempo(initialBpm, updatedChanges);
    }
  }, [isEditMode, onUpdateTempo, tempoChanges, initialBpm]);

  // ドラッグ開始
  const handleMouseDown = useCallback((e: React.MouseEvent, index: number) => {
    if (!isEditMode) return;
    e.preventDefault();
    e.stopPropagation();

    setDragState({
      isDragging: true,
      dragIndex: index,
      dragType: 'time',
      startX: e.clientX,
      startY: e.clientY
    });
  }, [isEditMode]);

  // ドラッグ中
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState.isDragging || dragState.dragIndex === null || !onUpdateTempo) return;

    const newTime = Math.max(0.1, Math.round(xToTime(e.clientX) * 10) / 10);
    const newBpm = Math.max(30, Math.min(300, Math.round(yToBpm(e.clientY))));

    const updatedChanges = tempoChanges.map((tc, i) => 
      i === dragState.dragIndex ? { time: newTime, bpm: newBpm } : tc
    );

    onUpdateTempo(initialBpm, updatedChanges);
  }, [dragState, onUpdateTempo, tempoChanges, initialBpm, xToTime, yToBpm]);

  // ドラッグ終了
  const handleMouseUp = useCallback(() => {
    setDragState({
      isDragging: false,
      dragIndex: null,
      dragType: null,
      startX: 0,
      startY: 0
    });
  }, []);

  // マウスイベントリスナーの登録/削除
  React.useEffect(() => {
    if (dragState.isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragState.isDragging, handleMouseMove, handleMouseUp]);

  // BPMグリッド線を生成
  const generateGridLines = () => {
    const minBpm = getMinBpm();
    const maxBpm = getMaxBpm();
    const bpmRange = getBpmRange();
    
    const gridStep = Math.max(5, Math.ceil(bpmRange / 10) / 5 * 5); // 5の倍数で調整
    const gridBpms = [];
    for (let bpm = Math.ceil(minBpm / gridStep) * gridStep; bpm <= maxBpm; bpm += gridStep) {
      gridBpms.push(bpm);
    }
    
    return gridBpms.map(bpm => (
      <div
        key={bpm}
        className="absolute left-0 right-0 border-t border-gray-300 dark:border-gray-600"
        style={{ top: `${bpmToY(bpm)}%` }}
      />
    ));
  };

  // テンポラインを生成（DIV要素版）
  const generateTempoLine = () => {
    if (visibleDuration <= 0) return null;

    const segments: React.JSX.Element[] = [];
    
    // 全テンポ変更点を時刻順にソート（時刻0の初期BPMも含める）
    const allTempoChanges = [
      { time: 0, bpm: initialBpm },
      ...tempoChanges.filter(change => change.time > 0)
    ].sort((a, b) => a.time - b.time);
    
    // 表示範囲に関連するテンポ変更点を取得
    const relevantChanges = allTempoChanges.filter(change => change.time <= visibleEndTime);
    if (relevantChanges.length === 0) {
      relevantChanges.push({ time: 0, bpm: initialBpm });
    }
    
    // 表示開始時点のBPMを取得
    let currentBpm = initialBpm;
    for (const change of relevantChanges) {
      if (change.time <= visibleStartTime) {
        currentBpm = change.bpm;
      } else {
        break;
      }
    }
    
    // 線を描画（水平線 + 垂直線の組み合わせ）
    let lastX = 0;
    let lastY = bpmToY(currentBpm);
    
    // 表示開始から開始点
    segments.push(
      <div
        key="start-point"
        className="absolute w-1 h-1 bg-blue-500 border border-white rounded-full"
        style={{
          left: `${lastX}%`,
          top: `${lastY}%`,
          transform: 'translate(-50%, -50%)'
        }}
      />
    );
    
    // 表示範囲内の変更点を処理
    for (const change of allTempoChanges) {
      if (change.time > visibleStartTime && change.time <= visibleEndTime) {
        const x = timeToX(change.time);
        const newY = bpmToY(change.bpm);
        
        // 水平線（前のBPMを維持）
        segments.push(
          <div
            key={`horizontal-${change.time}`}
            className="absolute bg-blue-500"
            style={{
              left: `${lastX}%`,
              top: `${lastY}%`,
              width: `${x - lastX}%`,
              height: '3px',
              transform: 'translateY(-50%)'
            }}
          />
        );
        
        // 垂直線（BPM変更）
        if (Math.abs(newY - lastY) > 0.1) {
          const lineHeight = Math.abs(newY - lastY);
          const lineTop = Math.min(lastY, newY);
          segments.push(
            <div
              key={`vertical-${change.time}`}
              className="absolute bg-blue-500"
              style={{
                left: `${x}%`,
                top: `${lineTop}%`,
                width: '3px',
                height: `${lineHeight}%`,
                transform: 'translateX(-50%)'
              }}
            />
          );
        }
        
        lastX = x;
        lastY = newY;
      }
    }
    
    // 表示終了まで延長
    if (lastX < 100) {
      segments.push(
        <div
          key="end-line"
          className="absolute bg-blue-500"
          style={{
            left: `${lastX}%`,
            top: `${lastY}%`,
            width: `${100 - lastX}%`,
            height: '3px',
            transform: 'translateY(-50%)'
          }}
        />
      );
    }
    
    return segments;
  };

  // テンポ変更点マーカーを生成（DIV要素版）
  const generateTempoPoints = () => {
    return tempoChanges
      .filter(change => change.time >= visibleStartTime && change.time <= visibleEndTime)
      .map((change, index) => {
        const x = timeToX(change.time);
        const y = bpmToY(change.bpm);
        const isHovered = hoveredPoint === index;
        
        return (
          <div key={`tempo-point-${change.time}`} className="absolute">
            <div
              className={`absolute bg-blue-500 border-2 border-white rounded-full cursor-pointer z-10 ${
                isHovered ? 'w-4 h-4' : 'w-3 h-3'
              }`}
              style={{
                left: `${x}%`,
                top: `${y}%`,
                transform: 'translate(-50%, -50%)',
                cursor: isEditMode ? 'pointer' : 'default'
              }}
              onMouseDown={(e) => handleMouseDown(e, index)}
              onDoubleClick={(e) => handleTempoPointDoubleClick(e, index)}
              onContextMenu={(e) => handleTempoPointRightClick(e, index)}
              onMouseEnter={() => setHoveredPoint(index)}
              onMouseLeave={() => setHoveredPoint(null)}
            />
            {/* ツールチップ */}
            {isHovered && (
              <div
                className="absolute bg-black bg-opacity-80 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-20 pointer-events-none"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: 'translate(5px, -50%)'
                }}
              >
                {change.time.toFixed(1)}s, {change.bpm}BPM
              </div>
            )}
          </div>
        );
      });
  };

  // BPMラベルを生成
  const generateBpmLabels = () => {
    const minBpm = getMinBpm();
    const maxBpm = getMaxBpm();
    const bpmRange = getBpmRange();
    
    const labelStep = Math.max(10, Math.ceil(bpmRange / 6) / 10 * 10);
    const labelBpms = [];
    for (let bpm = Math.ceil(minBpm / labelStep) * labelStep; bpm <= maxBpm; bpm += labelStep) {
      labelBpms.push(bpm);
    }
    
    return labelBpms.map(bpm => (
      <div
        key={`label-${bpm}`}
        className="absolute left-2 text-xs font-medium text-gray-600 dark:text-gray-400 transform -translate-y-1/2 pointer-events-none"
        style={{ top: `${bpmToY(bpm)}%` }}
      >
        {bpm}
      </div>
    ));
  };

  return (
    <div className="mb-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2">
      <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 flex items-center justify-between">
        <span>テンポトラック</span>
        {isEditMode && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            クリック: 追加 | ダブルクリック: 編集 | 右クリック: 削除
          </span>
        )}
      </div>
      
      <div className="relative">
        {/* BPMラベル */}
        {generateBpmLabels()}
        
        {/* トラック本体 */}
        <div
          ref={trackRef}
          className={`relative w-full h-24 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded ml-8 ${
            isEditMode ? 'cursor-crosshair' : ''
          }`}
          onClick={handleTrackClick}
          style={{ minHeight: '96px' }}
        >
          {/* BPMグリッド線 */}
          <div className="absolute inset-0 overflow-hidden">
            {generateGridLines()}
          </div>

          {/* テンポライン + ポイント（DIV版） */}
          <div className="absolute inset-0 w-full h-full pointer-events-none">
            {generateTempoLine()}
            <div className="pointer-events-auto">
              {generateTempoPoints()}
            </div>
          </div>

          {/* 現在再生位置インジケーター */}
          {currentTime >= visibleStartTime && currentTime <= visibleEndTime && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
              style={{
                left: `${timeToX(currentTime)}%`
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};