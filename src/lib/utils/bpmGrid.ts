import { TempoChange } from '@/types/features/medley';

export type BeatGridUnit = '2' | '4' | '8' | '1' | '1/2' | '1/4' | '1/8' | '1/16';

export interface BeatGridOptions {
  unit: BeatGridUnit;
  snapThreshold: number; // スナップする距離の閾値（秒）
  enabled: boolean;
}

/**
 * ビートグリッドの単位を数値に変換
 */
export const beatUnitToFraction = (unit: BeatGridUnit): number => {
  switch (unit) {
    case '8': return 8;    // 8拍（2小節）
    case '4': return 4;    // 4拍（1小節）
    case '2': return 2;    // 2拍
    case '1': return 1;    // 1拍
    case '1/2': return 0.5;
    case '1/4': return 0.25;
    case '1/8': return 0.125;
    case '1/16': return 0.0625;
    default: return 4;     // デフォルトは4拍
  }
};

/**
 * 指定した時刻でのBPMを取得
 */
export const getBpmAtTime = (time: number, initialBpm: number, tempoChanges: TempoChange[]): number => {
  if (!tempoChanges.length) return initialBpm;
  
  const sortedChanges = [...tempoChanges].sort((a, b) => a.time - b.time);
  const lastChange = sortedChanges.findLast(change => change.time <= time);
  return lastChange ? lastChange.bpm : initialBpm;
};

/**
 * 時刻からビート位置を計算（累積ビート数）
 */
export const timeToBeats = (time: number, initialBpm: number, tempoChanges: TempoChange[]): number => {
  if (time <= 0) return 0;
  
  const sortedChanges = [...tempoChanges].sort((a, b) => a.time - b.time);
  let totalBeats = 0;
  let lastTime = 0;
  let currentBpm = initialBpm;
  
  for (const change of sortedChanges) {
    if (change.time >= time) break;
    
    // 前の区間のビート数を計算
    const segmentDuration = change.time - lastTime;
    const beatsPerSecond = currentBpm / 60;
    totalBeats += segmentDuration * beatsPerSecond;
    
    lastTime = change.time;
    currentBpm = change.bpm;
  }
  
  // 最後の区間（指定時刻まで）
  const remainingDuration = time - lastTime;
  const beatsPerSecond = currentBpm / 60;
  totalBeats += remainingDuration * beatsPerSecond;
  
  return totalBeats;
};

/**
 * ビート位置から時刻を計算
 */
export const beatsToTime = (beats: number, initialBpm: number, tempoChanges: TempoChange[]): number => {
  if (beats <= 0) return 0;
  
  const sortedChanges = [...tempoChanges].sort((a, b) => a.time - b.time);
  let totalTime = 0;
  let processedBeats = 0;
  let currentBpm = initialBpm;
  
  for (const change of sortedChanges) {
    // この区間で処理可能なビート数を計算
    const changeTimeInBeats = timeToBeats(change.time, initialBpm, tempoChanges.filter(tc => tc.time < change.time));
    const beatsInSegment = changeTimeInBeats - processedBeats;
    
    if (processedBeats + beatsInSegment >= beats) {
      // 目標ビート数がこの区間内にある
      const remainingBeats = beats - processedBeats;
      const secondsPerBeat = 60 / currentBpm;
      return totalTime + (remainingBeats * secondsPerBeat);
    }
    
    // この区間を完全に処理
    const secondsPerBeat = 60 / currentBpm;
    totalTime += beatsInSegment * secondsPerBeat;
    processedBeats += beatsInSegment;
    currentBpm = change.bpm;
  }
  
  // 最後の区間で残りを処理
  const remainingBeats = beats - processedBeats;
  const secondsPerBeat = 60 / currentBpm;
  return totalTime + (remainingBeats * secondsPerBeat);
};

/**
 * 指定した時刻を最も近いビートグリッドにスナップ
 */
export const snapToGrid = (
  time: number,
  initialBpm: number,
  tempoChanges: TempoChange[],
  options: BeatGridOptions
): number => {
  if (!options.enabled) return time;
  
  const beatFraction = beatUnitToFraction(options.unit);
  const currentBeats = timeToBeats(time, initialBpm, tempoChanges);
  
  // 最も近いグリッドポイントを計算
  const gridBeats = Math.round(currentBeats / beatFraction) * beatFraction;
  const snappedTime = beatsToTime(gridBeats, initialBpm, tempoChanges);
  
  // スナップ閾値内かチェック
  if (Math.abs(snappedTime - time) <= options.snapThreshold) {
    return snappedTime;
  }
  
  return time;
};

export interface BeatGridLine {
  time: number;
  isMajor: boolean; // メジャーグリッド（1拍）かどうか
  beatNumber: number; // ビート番号
}

/**
 * 表示範囲内のビートグリッド線を生成（メジャー/マイナー区別付き）
 */
export const generateBeatGridLines = (
  visibleStartTime: number,
  visibleDuration: number,
  initialBpm: number,
  tempoChanges: TempoChange[],
  unit: BeatGridUnit
): BeatGridLine[] => {
  const visibleEndTime = visibleStartTime + visibleDuration;
  const beatFraction = beatUnitToFraction(unit);
  
  const startBeats = timeToBeats(visibleStartTime, initialBpm, tempoChanges);
  const endBeats = timeToBeats(visibleEndTime, initialBpm, tempoChanges);
  
  const gridLines: BeatGridLine[] = [];
  
  // グリッド線数を制限（最大30本）
  const maxGridLines = 30;
  const totalBeats = endBeats - startBeats;
  const estimatedGridCount = Math.ceil(totalBeats / beatFraction);
  
  // グリッド線が多すぎる場合は、より大きな単位に自動調整
  let adjustedBeatFraction = beatFraction;
  if (estimatedGridCount > maxGridLines) {
    // 適切な単位に自動調整
    const targetFraction = totalBeats / maxGridLines;
    const possibleFractions = [0.0625, 0.125, 0.25, 0.5, 1, 2, 4, 8, 16];
    adjustedBeatFraction = possibleFractions.find(f => f >= targetFraction) || 8;
  }
  
  // 開始ビートを最も近いグリッドに調整
  const startGridBeat = Math.ceil(startBeats / adjustedBeatFraction) * adjustedBeatFraction;
  
  for (let beat = startGridBeat; beat <= endBeats; beat += adjustedBeatFraction) {
    const time = beatsToTime(beat, initialBpm, tempoChanges);
    if (time >= visibleStartTime && time <= visibleEndTime && gridLines.length < maxGridLines) {
      // メジャーグリッドかどうかを判定
      // 大きな単位（4拍以上）は全てメジャー、小さな単位は1拍の倍数のみメジャー
      const isMajor = adjustedBeatFraction >= 4 || Math.abs(beat % 4) < 0.001;
      
      gridLines.push({
        time,
        isMajor,
        beatNumber: Math.round(beat)
      });
    }
  }
  
  return gridLines;
};

/**
 * レガシー互換性のための関数（時間のみを返す）
 */
export const generateBeatGridTimes = (
  visibleStartTime: number,
  visibleDuration: number,
  initialBpm: number,
  tempoChanges: TempoChange[],
  unit: BeatGridUnit
): number[] => {
  return generateBeatGridLines(visibleStartTime, visibleDuration, initialBpm, tempoChanges, unit)
    .map(line => line.time);
};

/**
 * ビートグリッド単位の表示名を取得
 */
export const getBeatUnitDisplayName = (unit: BeatGridUnit): string => {
  switch (unit) {
    case '8': return '8拍';
    case '4': return '4拍';
    case '2': return '2拍';
    case '1': return '1拍';
    case '1/2': return '1/2拍';
    case '1/4': return '1/4拍';
    case '1/8': return '1/8拍';
    case '1/16': return '1/16拍';
    default: return '4拍';
  }
};

/**
 * 表示範囲とBPMに基づく推奨グリッド単位を取得
 */
export const getRecommendedBeatUnit = (
  bpm: number, 
  visibleDuration?: number
): BeatGridUnit => {
  if (!visibleDuration) {
    // 従来の互換性（BPMのみ）
    if (bpm < 80) return '4';
    if (bpm < 120) return '2';
    return '1';
  }
  
  // 表示範囲に基づく推奨
  const targetGridCount = 10; // 理想的なグリッド数
  const beatDuration = 60 / bpm; // 1拍の秒数
  const targetInterval = visibleDuration / targetGridCount;
  const targetBeats = targetInterval / beatDuration;
  
  // 最も近い単位を選択
  const units: BeatGridUnit[] = ['8', '4', '2', '1', '1/2', '1/4', '1/8', '1/16'];
  const fractions = units.map(u => beatUnitToFraction(u));
  
  let bestUnit: BeatGridUnit = '4';
  let bestDiff = Infinity;
  
  for (let i = 0; i < units.length; i++) {
    const diff = Math.abs(fractions[i] - targetBeats);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestUnit = units[i];
    }
  }
  
  return bestUnit;
};

/**
 * BPMのみによる従来の推奨取得（互換性のため）
 */
export const getRecommendedBeatUnitByBpm = (bpm: number): BeatGridUnit => {
  return getRecommendedBeatUnit(bpm);
};