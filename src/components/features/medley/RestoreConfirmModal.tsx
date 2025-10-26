'use client'

import React from 'react'
import type { MedleySnapshot } from '@/types'

interface RestoreConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  snapshot: MedleySnapshot | null
  currentSongCount: number
  restoredAt: Date | null
  isLoading?: boolean
}

export default function RestoreConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  snapshot,
  currentSongCount,
  restoredAt,
  isLoading = false
}: RestoreConfirmModalProps) {
  if (!isOpen || !snapshot) return null

  const songCountDiff = snapshot.songs.length - currentSongCount

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">🔄 復元の確認</h2>
            <button
              onClick={onClose}
              className="text-white hover:text-blue-100 transition-colors"
              aria-label="閉じる"
              disabled={isLoading}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Warning message */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-900 flex items-start">
              <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>
                この操作により、現在のタイムラインデータが以下のスナップショット時点の状態に置き換えられます。
                <br />
                <strong>現在の編集内容は失われます。</strong>元に戻すことはできますが、復元操作も履歴として記録されます。
              </span>
            </p>
          </div>

          {/* Snapshot information */}
          <div className="border border-gray-200 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-gray-900 flex items-center">
              📸 復元先のスナップショット
            </h3>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">タイトル:</span>
                <p className="font-medium text-gray-900 mt-1">{snapshot.title}</p>
              </div>

              {snapshot.creator && (
                <div>
                  <span className="text-gray-600">制作者:</span>
                  <p className="font-medium text-gray-900 mt-1">{snapshot.creator}</p>
                </div>
              )}

              <div>
                <span className="text-gray-600">総再生時間:</span>
                <p className="font-medium text-gray-900 mt-1">
                  {Math.floor(snapshot.duration / 60)}:{String(snapshot.duration % 60).padStart(2, '0')}
                </p>
              </div>

              <div>
                <span className="text-gray-600">楽曲数:</span>
                <p className="font-medium text-gray-900 mt-1">{snapshot.songs.length}曲</p>
              </div>

              {restoredAt && (
                <div className="col-span-2">
                  <span className="text-gray-600">作成日時:</span>
                  <p className="font-medium text-gray-900 mt-1">
                    {restoredAt.toLocaleString('ja-JP')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Change summary */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
              📊 変更の概要
            </h3>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">現在の楽曲数:</span>
                <span className="font-medium text-gray-900">{currentSongCount}曲</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-600">復元後の楽曲数:</span>
                <span className="font-medium text-gray-900">{snapshot.songs.length}曲</span>
              </div>

              <div className="border-t border-gray-200 pt-2 mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">変化:</span>
                  <span className={`font-bold ${
                    songCountDiff > 0 ? 'text-green-600' :
                    songCountDiff < 0 ? 'text-red-600' :
                    'text-gray-600'
                  }`}>
                    {songCountDiff > 0 ? '+' : ''}{songCountDiff}曲
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  復元中...
                </>
              ) : (
                '復元する'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

RestoreConfirmModal.displayName = 'RestoreConfirmModal'
