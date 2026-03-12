'use client'

import React from 'react'
import { MedleyEditHistory } from '@/types'
import { Button } from "@/components/ui/button";

interface ContributorsDisplayProps {
  editHistory?: MedleyEditHistory[]
  lastEditor?: string
  lastEditedAt?: string
  showTitle?: boolean
  compact?: boolean
  isAuthenticated?: boolean
  onRestore?: (editHistoryId: string) => void
}

function formatRelativeTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - dateObj.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    if (diffHours === 0) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60))
      if (diffMinutes === 0) {
        return 'たった今'
      }
      return `${diffMinutes}分前`
    }
    return `${diffHours}時間前`
  } else if (diffDays === 1) {
    return '昨日'
  } else if (diffDays < 7) {
    return `${diffDays}日前`
  } else if (diffDays < 30) {
    const diffWeeks = Math.floor(diffDays / 7)
    return `${diffWeeks}週間前`
  } else if (diffDays < 365) {
    const diffMonths = Math.floor(diffDays / 30)
    return `${diffMonths}ヶ月前`
  } else {
    const diffYears = Math.floor(diffDays / 365)
    return `${diffYears}年前`
  }
}

function formatActionText(action: string): { text: string; color: string } {
  switch (action) {
    case 'create_medley':
      return { text: 'メドレーを作成', color: 'text-green-700' }
    case 'update_medley':
      return { text: 'メドレーを更新', color: 'text-blue-700' }
    case 'delete_medley':
      return { text: 'メドレーを削除', color: 'text-red-700' }
    case 'add_song':
      return { text: '楽曲を追加', color: 'text-orange-700' }
    case 'update_song':
      return { text: '楽曲を更新', color: 'text-blue-700' }
    case 'delete_song':
      return { text: '楽曲を削除', color: 'text-red-700' }
    case 'reorder_songs':
      return { text: '楽曲を並び替え', color: 'text-purple-700' }
    default:
      return { text: '編集', color: 'text-gray-700' }
  }
}

const ContributorsDisplay: React.FC<ContributorsDisplayProps> = ({
  editHistory = [],
  lastEditor,
  lastEditedAt,
  showTitle = true,
  compact = false,
  isAuthenticated = false,
  onRestore
}) => {
  return (
    <div className={`${compact ? 'bg-gray-50 p-4 rounded-lg' : 'bg-white rounded-xl shadow-sm border border-gray-200 p-6'}`}>
      {showTitle && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className={`${compact ? 'text-lg' : 'text-xl'} font-semibold text-gray-900`}>
              編集履歴
            </h3>
            {editHistory.length > 0 && (
              <span className="bg-gradient-to-r from-orange-400 to-orange-500 text-white text-xs font-medium px-2 py-1 rounded-full">
                {editHistory.length}
              </span>
            )}
          </div>

          {lastEditor && lastEditedAt && (
            <div className="text-sm text-gray-500">
              最終更新: {formatRelativeTime(lastEditedAt)} by {lastEditor}
            </div>
          )}
        </div>
      )}

      {editHistory.length === 0 ? (
        <p className="text-gray-500 text-sm">まだ編集履歴がありません</p>
      ) : (
        <div className="space-y-3">
          {editHistory.map((edit, index) => {
            const actionInfo = formatActionText(edit.action)
            const hasSnapshot = edit.changes && typeof edit.changes.snapshot === 'object' && edit.changes.snapshot !== null

            return (
              <div
                key={`${edit.id}-${index}`}
                className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                  {edit.editorNickname.charAt(0).toUpperCase()}
                </div>

                {/* Edit info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900">{edit.editorNickname}</span>
                    <span className={`text-sm ${actionInfo.color}`}>{actionInfo.text}</span>
                    {hasSnapshot && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        📸 復元可能
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {formatRelativeTime(edit.createdAt)}
                  </div>
                  {edit.changes && (typeof edit.changes.title === 'string' || typeof edit.changes.songCount === 'number') && (
                    <div className="text-xs text-gray-500 mt-1 truncate">
                      {typeof edit.changes.title === 'string' && `「${edit.changes.title}」`}
                      {typeof edit.changes.songCount === 'number' && ` (${edit.changes.songCount}曲)`}
                    </div>
                  )}
                </div>

                {/* Restore button */}
                {isAuthenticated && hasSnapshot && onRestore && (
                  <Button
                    size="sm"
                    onClick={() => onRestore(edit.id)}
                    title="この時点に復元"
                    className="flex-shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>復元</span>
                  </Button>
                )}

                {/* Timeline connector (vertical line) */}
                {index < editHistory.length - 1 && (
                  <div className="absolute left-8 top-14 w-0.5 h-3 bg-gray-300" />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

ContributorsDisplay.displayName = 'ContributorsDisplay'

export default ContributorsDisplay
