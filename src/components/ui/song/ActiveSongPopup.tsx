'use client';

import React, { useEffect, useState } from 'react';
import { SongSection } from '@/types';
import SongThumbnail from './SongThumbnail';
import { logger } from '@/lib/utils/logger';

// Explicit production build marker - prevents tree-shaking removal
if (typeof window !== 'undefined') {
  console.log('🔥 ActiveSongPopup: Module loaded in production', {
    timestamp: new Date().toISOString(),
    url: window.location.href
  });
}

interface ActiveSongPopupProps {
  currentTime: number;
  songs: SongSection[];
  isVisible: boolean;
}

interface ActiveSong extends SongSection {
  uniqueId: string;
}

export const ActiveSongPopup: React.FC<ActiveSongPopupProps> = ({
  currentTime,
  songs,
  isVisible
}) => {
  const [activeSongs, setActiveSongs] = useState<ActiveSong[]>([]);
  const [prevActiveSongs, setPrevActiveSongs] = useState<ActiveSong[]>([]);

  // 初期マウント時のログ（プロダクション環境対応）
  useEffect(() => {
    console.log('🎵 ActiveSongPopup: Component mounted');
    logger.info('🎵 ActiveSongPopup: Component mounted');
    return () => {
      console.log('🎵 ActiveSongPopup: Component unmounted');
      logger.info('🎵 ActiveSongPopup: Component unmounted');
    };
  }, []);

  useEffect(() => {
    // プロダクション環境でも確実にログを出力
    console.log('🎵 ActiveSongPopup: Effect triggered', { 
      isVisible, 
      currentTime, 
      songsCount: songs.length,
      timestamp: new Date().toISOString()
    });
    logger.info('🎵 ActiveSongPopup: Effect triggered', { 
      isVisible, 
      currentTime, 
      songsCount: songs.length 
    });

    if (!isVisible) {
      console.log('🎵 ActiveSongPopup: Not visible, skipping', { isVisible, currentTime });
      logger.info('🎵 ActiveSongPopup: Not visible, skipping');
      return;
    }

    const currentActiveSongs: ActiveSong[] = [];
    
    songs.forEach((song, index) => {
      // 境界値の問題を解決するため、より寛容な時間チェックを使用
      const isActive = currentTime >= song.startTime && currentTime < song.endTime + 0.1;
      
      if (isActive) {
        console.log('🎵 ActiveSongPopup: Found active song', { 
          title: song.title, 
          artist: song.artist,
          startTime: song.startTime,
          endTime: song.endTime,
          currentTime,
          timeCheck: `${currentTime} >= ${song.startTime} && ${currentTime} < ${song.endTime + 0.1}`
        });
        logger.info('🎵 ActiveSongPopup: Found active song', { 
          title: song.title, 
          artist: song.artist,
          startTime: song.startTime,
          endTime: song.endTime,
          currentTime,
          timeCheck: `${currentTime} >= ${song.startTime} && ${currentTime} < ${song.endTime + 0.1}`
        });
        currentActiveSongs.push({
          ...song,
          uniqueId: `${index}-${song.id}`
        });
      }
    });

    // 重複を除去（同じ楽曲が複数セグメントで同時に再生される場合）
    const uniqueActiveSongs = currentActiveSongs.reduce((acc: ActiveSong[], current) => {
      const existing = acc.find(song => 
        song.title === current.title && 
        song.artist === current.artist &&
        song.originalLink === current.originalLink
      );
      if (!existing) {
        acc.push(current);
      }
      return acc;
    }, []);

    console.log('🎵 ActiveSongPopup: Updated active songs', { 
      found: currentActiveSongs.length, 
      unique: uniqueActiveSongs.length,
      songs: uniqueActiveSongs.map(s => ({ title: s.title, artist: s.artist })),
      currentTime
    });
    logger.info('🎵 ActiveSongPopup: Updated active songs', { 
      found: currentActiveSongs.length, 
      unique: uniqueActiveSongs.length,
      songs: uniqueActiveSongs.map(s => ({ title: s.title, artist: s.artist }))
    });

    // 前の状態を保存してからstateを更新
    setActiveSongs(prevState => {
      setPrevActiveSongs(prevState);
      return uniqueActiveSongs;
    });
  }, [currentTime, songs, isVisible]);

  // デバッグモードの場合は常に何かを表示
  const showDebug = typeof window !== 'undefined' && 
    (window.location.search.includes('debug=true') || window.location.hostname === 'localhost');

  if (!isVisible || activeSongs.length === 0) {
    console.log('🎵 ActiveSongPopup: Not rendering', { 
      isVisible, 
      activeSongsLength: activeSongs.length,
      showDebug,
      currentTime 
    });
    logger.info('🎵 ActiveSongPopup: Not rendering', { 
      isVisible, 
      activeSongsLength: activeSongs.length 
    });

    // デバッグモード時は状態を表示
    if (showDebug) {
      return (
        <div 
          className="fixed top-24 left-4 bg-red-100 border-2 border-red-300 rounded-lg p-3 max-w-xs"
          style={{
            position: 'fixed',
            top: '6rem',
            left: '1rem',
            zIndex: 1000,
            pointerEvents: 'auto'
          }}
        >
          <div className="text-red-700 text-xs font-mono">
            <div>🐛 ActiveSongPopup Debug</div>
            <div>isVisible: {isVisible ? '✓' : '✗'}</div>
            <div>activeSongs: {activeSongs.length}</div>
            <div>currentTime: {currentTime.toFixed(1)}s</div>
          </div>
        </div>
      );
    }
    
    return null;
  }

  console.log('🎵 ActiveSongPopup: Rendering', { 
    activeSongs: activeSongs.map(s => s.title),
    prevActiveSongs: prevActiveSongs.map(s => s.title),
    currentTime,
    showDebug
  });
  logger.info('🎵 ActiveSongPopup: Rendering', { 
    activeSongs: activeSongs.map(s => s.title),
    prevActiveSongs: prevActiveSongs.map(s => s.title)
  });

  return (
    <div 
      className="fixed top-24 left-4 space-y-2"
      style={{
        position: 'fixed',
        top: '6rem',
        left: '1rem',
        zIndex: 1000,
        pointerEvents: 'none'
      }}
    >
      {/* デバッグモードでテスト表示 */}
      {showDebug && activeSongs.length === 0 && (
        <div className="bg-yellow-100 border-2 border-yellow-300 rounded-lg p-3 max-w-xs">
          <div className="text-yellow-800 text-xs">
            <div>🎵 テスト表示</div>
            <div>時刻: {currentTime.toFixed(1)}s</div>
            <div>楽曲待機中...</div>
          </div>
        </div>
      )}

      {activeSongs.map((song, index) => {
        const isNewSong = !prevActiveSongs.some(prevSong => prevSong.uniqueId === song.uniqueId);
        
        return (
          <div
            key={song.uniqueId}
            className={`
              bg-white rounded-lg shadow-lg border-2 border-orange-200 p-3 max-w-xs
              transform transition-all duration-300 ease-out
              ${isNewSong ? 'animate-slide-in' : 'translate-x-0 opacity-100'}
            `}
            style={{
              animationDelay: isNewSong ? `${index * 100}ms` : '0ms',
              animationFillMode: 'forwards',
              pointerEvents: 'auto'
            }}
          >
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <SongThumbnail
                  title={song.title}
                  originalLink={song.originalLink}
                  links={song.links}
                  size="sm"
                  className="w-12 h-12 rounded-md"
                  isClickable={false}
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 truncate">
                  {song.title}
                </h3>
                <p className="text-xs text-gray-600 truncate">
                  {song.artist}
                </p>
                <div className="flex items-center space-x-1 mt-1">
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-orange-600 font-medium">
                    再生中
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Explicit production build marker - ensures component is included in bundle
ActiveSongPopup.displayName = 'ActiveSongPopup';

// Export verification for production builds
if (typeof window !== 'undefined') {
  console.log('🔥 ActiveSongPopup: Component definition exported', {
    displayName: ActiveSongPopup.displayName,
    timestamp: new Date().toISOString()
  });
}