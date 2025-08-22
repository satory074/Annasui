"use client";

import { SongSection } from "@/types";
import BaseModal from "@/components/ui/modal/BaseModal";
import SongInfoDisplay from "@/components/ui/song/SongInfoDisplay";

interface SongDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  song: SongSection | null;
  onSeek?: (time: number) => void;
}

export default function SongDetailModal({
  isOpen,
  onClose,
  song,
  onSeek
}: SongDetailModalProps) {


  if (!song) return null;

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} maxWidth="md">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            楽曲詳細
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <SongInfoDisplay song={song} variant="detailed" onSeek={onSeek} />

        {/* ボタン */}
        <div className="flex justify-center mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            閉じる
          </button>
        </div>
    </BaseModal>
  );
}