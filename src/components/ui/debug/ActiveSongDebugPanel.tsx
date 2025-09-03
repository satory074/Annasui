'use client';

import React from 'react';
import { SongSection } from '@/types';

interface ActiveSongDebugPanelProps {
  currentTime: number;
  songs: SongSection[];
  isVisible: boolean;
  playerReady: boolean;
  editModalOpen: boolean;
  songSearchModalOpen: boolean;
  manualAddModalOpen: boolean;
  activeSongs: SongSection[];
}

export const ActiveSongDebugPanel: React.FC<ActiveSongDebugPanelProps> = ({
  currentTime,
  songs,
  isVisible,
  playerReady,
  editModalOpen,
  songSearchModalOpen,
  manualAddModalOpen,
  activeSongs
}) => {
  // プロダクション環境でのデバッグを有効にするかのチェック
  const showDebug = typeof window !== 'undefined' && 
    (window.location.search.includes('debug=true') || window.location.hostname === 'localhost');

  if (!showDebug) {
    return null;
  }

  const currentActiveSongs = songs.filter(song => 
    currentTime >= song.startTime && currentTime <= song.endTime
  );

  return (
    <div className="fixed bottom-4 left-4 z-[60] bg-black bg-opacity-90 text-white p-4 rounded-lg text-xs font-mono max-w-md">
      <h3 className="text-yellow-400 font-bold mb-2">🐛 ActiveSongPopup Debug</h3>
      
      <div className="space-y-1">
        <div>現在時刻: <span className="text-green-400">{currentTime.toFixed(1)}s</span></div>
        <div>総楽曲数: <span className="text-blue-400">{songs.length}</span></div>
        
        <div className="mt-2 pt-2 border-t border-gray-600">
          <div className="text-yellow-400">表示条件:</div>
          <div>playerReady: <span className={playerReady ? 'text-green-400' : 'text-red-400'}>{playerReady ? '✓' : '✗'}</span></div>
          <div>editModalOpen: <span className={editModalOpen ? 'text-red-400' : 'text-green-400'}>{editModalOpen ? '✗ (open)' : '✓ (closed)'}</span></div>
          <div>songSearchModalOpen: <span className={songSearchModalOpen ? 'text-red-400' : 'text-green-400'}>{songSearchModalOpen ? '✗ (open)' : '✓ (closed)'}</span></div>
          <div>manualAddModalOpen: <span className={manualAddModalOpen ? 'text-red-400' : 'text-green-400'}>{manualAddModalOpen ? '✗ (open)' : '✓ (closed)'}</span></div>
          <div>最終判定: <span className={isVisible ? 'text-green-400' : 'text-red-400'}>{isVisible ? '✓ VISIBLE' : '✗ HIDDEN'}</span></div>
        </div>

        <div className="mt-2 pt-2 border-t border-gray-600">
          <div className="text-yellow-400">アクティブ楽曲検出:</div>
          <div>検出数: <span className="text-green-400">{currentActiveSongs.length}</span></div>
          {currentActiveSongs.map((song, index) => (
            <div key={index} className="ml-2 text-xs">
              <div className="text-blue-400">• {song.title}</div>
              <div className="ml-2 text-gray-400">{song.artist}</div>
              <div className="ml-2 text-gray-400">時間: {song.startTime}s - {song.endTime}s</div>
            </div>
          ))}
          {currentActiveSongs.length === 0 && (
            <div className="ml-2 text-gray-500">検出された楽曲なし</div>
          )}
        </div>

        <div className="mt-2 pt-2 border-t border-gray-600">
          <div className="text-yellow-400">ポップアップ状態:</div>
          <div>activeSongs配列: <span className="text-green-400">{activeSongs.length}</span></div>
        </div>

        <div className="mt-2 pt-2 border-t border-gray-600 text-xs text-gray-400">
          URLに ?debug=true を追加してデバッグ表示
        </div>
      </div>
    </div>
  );
};