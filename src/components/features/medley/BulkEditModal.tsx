"use client";

import { useState, useEffect } from "react";
import { SongSection } from "@/types";
import BaseModal from "@/components/ui/modal/BaseModal";

interface BulkEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  songs: SongSection[];
  onBulkUpdate: (updatedSongs: SongSection[]) => void;
  onBulkDelete: (songIds: number[]) => void;
}

interface BulkEditData {
  titleTemplate: string;
  artistTemplate: string;
  adjustStartTime: number;
  adjustEndTime: number;
  setDuration: number;
  applyTitle: boolean;
  applyArtist: boolean;
  applyTimeAdjustment: boolean;
  applyDuration: boolean;
}

export default function BulkEditModal({
  isOpen,
  onClose,
  songs,
  onBulkUpdate,
  onBulkDelete
}: BulkEditModalProps) {
  const [selectedSongs, setSelectedSongs] = useState<Set<number>>(new Set());
  const [bulkEditData, setBulkEditData] = useState<BulkEditData>({
    titleTemplate: "",
    artistTemplate: "",
    adjustStartTime: 0,
    adjustEndTime: 0,
    setDuration: 30,
    applyTitle: false,
    applyArtist: false,
    applyTimeAdjustment: false,
    applyDuration: false
  });

  // モーダルが開いたときに全ての楽曲を選択状態にする
  useEffect(() => {
    if (isOpen) {
      setSelectedSongs(new Set(songs.map(song => song.id)));
    }
  }, [isOpen, songs]);

  const handleClose = () => {
    setSelectedSongs(new Set());
    setBulkEditData({
      titleTemplate: "",
      artistTemplate: "",
      adjustStartTime: 0,
      adjustEndTime: 0,
      setDuration: 30,
      applyTitle: false,
      applyArtist: false,
      applyTimeAdjustment: false,
      applyDuration: false
    });
    onClose();
  };

  const handleSongToggle = (songId: number) => {
    const newSelected = new Set(selectedSongs);
    if (newSelected.has(songId)) {
      newSelected.delete(songId);
    } else {
      newSelected.add(songId);
    }
    setSelectedSongs(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedSongs.size === songs.length) {
      setSelectedSongs(new Set());
    } else {
      setSelectedSongs(new Set(songs.map(song => song.id)));
    }
  };

  const handleBulkUpdate = () => {
    const updatedSongs = songs.map(song => {
      if (!selectedSongs.has(song.id)) return song;

      const updatedSong = { ...song };

      // タイトルの一括更新
      if (bulkEditData.applyTitle && bulkEditData.titleTemplate.trim()) {
        const songIndex = songs.findIndex(s => s.id === song.id) + 1;
        updatedSong.title = bulkEditData.titleTemplate
          .replace(/\{index\}/g, songIndex.toString())
          .replace(/\{time\}/g, formatTime(song.startTime));
      }

      // アーティストの一括更新
      if (bulkEditData.applyArtist && bulkEditData.artistTemplate.trim()) {
        updatedSong.artist = bulkEditData.artistTemplate;
      }

      // 時間調整
      if (bulkEditData.applyTimeAdjustment) {
        updatedSong.startTime = Math.max(0, song.startTime + bulkEditData.adjustStartTime);
        updatedSong.endTime = Math.max(updatedSong.startTime + 0.1, song.endTime + bulkEditData.adjustEndTime);
      }

      // 固定長さ設定
      if (bulkEditData.applyDuration) {
        updatedSong.endTime = updatedSong.startTime + bulkEditData.setDuration;
      }

      return updatedSong;
    });

    onBulkUpdate(updatedSongs);
    handleClose();
  };

  const handleBulkDelete = () => {
    if (selectedSongs.size === 0) return;
    
    const confirm = window.confirm(`選択した${selectedSongs.size}曲を削除しますか？`);
    if (confirm) {
      onBulkDelete(Array.from(selectedSongs));
      handleClose();
    }
  };

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const selectedCount = selectedSongs.size;

  return (
    <BaseModal isOpen={isOpen} onClose={handleClose} maxWidth="xl">
      <h2 className="text-xl font-bold mb-4 text-gray-900">
        一括編集 ({songs.length}曲)
      </h2>

      <div className="space-y-4">
        {/* 楽曲選択エリア */}
        <div className="border border-gray-300 rounded-md max-h-48 overflow-y-auto">
          <div className="bg-gray-50 px-3 py-2 border-b border-gray-300 sticky top-0">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={selectedSongs.size === songs.length && songs.length > 0}
                onChange={handleSelectAll}
                className="mr-2"
              />
              <span className="font-medium">全選択 ({selectedCount}/{songs.length}曲選択中)</span>
            </label>
          </div>
          <div className="divide-y divide-gray-200">
            {songs.map((song, index) => (
              <label key={song.id} className="flex items-center p-3 hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={selectedSongs.has(song.id)}
                  onChange={() => handleSongToggle(song.id)}
                  className="mr-3"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {song.title || `楽曲 ${index + 1}`}
                  </div>
                  <div className="text-sm text-gray-600">
                    {song.artist && `${song.artist} • `}
                    {formatTime(song.startTime)} - {formatTime(song.endTime)}
                    <span className="ml-2 text-xs bg-gray-200 px-1 rounded">
                      {Math.round((song.endTime - song.startTime) * 10) / 10}s
                    </span>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* 編集オプション */}
        {selectedCount > 0 && (
          <div className="space-y-4 border-t border-gray-300 pt-4">
            {/* タイトル一括設定 */}
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="apply-title"
                checked={bulkEditData.applyTitle}
                onChange={(e) => setBulkEditData({ ...bulkEditData, applyTitle: e.target.checked })}
                className="mt-1"
              />
              <div className="flex-1">
                <label htmlFor="apply-title" className="block text-sm font-medium text-gray-700 mb-1">
                  タイトル一括設定
                </label>
                <input
                  type="text"
                  value={bulkEditData.titleTemplate}
                  onChange={(e) => setBulkEditData({ ...bulkEditData, titleTemplate: e.target.value })}
                  placeholder="例: 楽曲{index} または {time}の楽曲"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  disabled={!bulkEditData.applyTitle}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {"{index}"} = 連番、{"{time}"} = 開始時刻
                </p>
              </div>
            </div>

            {/* アーティスト一括設定 */}
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="apply-artist"
                checked={bulkEditData.applyArtist}
                onChange={(e) => setBulkEditData({ ...bulkEditData, applyArtist: e.target.checked })}
                className="mt-1"
              />
              <div className="flex-1">
                <label htmlFor="apply-artist" className="block text-sm font-medium text-gray-700 mb-1">
                  アーティスト一括設定
                </label>
                <input
                  type="text"
                  value={bulkEditData.artistTemplate}
                  onChange={(e) => setBulkEditData({ ...bulkEditData, artistTemplate: e.target.value })}
                  placeholder="例: Various Artists"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  disabled={!bulkEditData.applyArtist}
                />
              </div>
            </div>

            {/* 時間調整 */}
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="apply-time"
                checked={bulkEditData.applyTimeAdjustment}
                onChange={(e) => setBulkEditData({ ...bulkEditData, applyTimeAdjustment: e.target.checked })}
                className="mt-1"
              />
              <div className="flex-1">
                <label htmlFor="apply-time" className="block text-sm font-medium text-gray-700 mb-1">
                  時間調整（秒）
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">開始時刻調整</label>
                    <input
                      type="number"
                      step="0.1"
                      value={bulkEditData.adjustStartTime}
                      onChange={(e) => setBulkEditData({ ...bulkEditData, adjustStartTime: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      disabled={!bulkEditData.applyTimeAdjustment}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">終了時刻調整</label>
                    <input
                      type="number"
                      step="0.1"
                      value={bulkEditData.adjustEndTime}
                      onChange={(e) => setBulkEditData({ ...bulkEditData, adjustEndTime: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      disabled={!bulkEditData.applyTimeAdjustment}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 固定長さ設定 */}
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="apply-duration"
                checked={bulkEditData.applyDuration}
                onChange={(e) => setBulkEditData({ ...bulkEditData, applyDuration: e.target.checked })}
                className="mt-1"
              />
              <div className="flex-1">
                <label htmlFor="apply-duration" className="block text-sm font-medium text-gray-700 mb-1">
                  長さ統一（秒）
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={bulkEditData.setDuration}
                  onChange={(e) => setBulkEditData({ ...bulkEditData, setDuration: parseFloat(e.target.value) || 30 })}
                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                  disabled={!bulkEditData.applyDuration}
                />
                <span className="text-sm text-gray-600 ml-2">秒</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ボタン */}
      <div className="flex justify-between mt-6">
        <div>
          {selectedCount > 0 && (
            <button
              onClick={handleBulkDelete}
              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              選択した{selectedCount}曲を削除
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            キャンセル
          </button>
          <button
            onClick={handleBulkUpdate}
            disabled={selectedCount === 0}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
          >
            {selectedCount}曲を一括更新
          </button>
        </div>
      </div>
    </BaseModal>
  );
}