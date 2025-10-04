'use client'

import React from 'react'
import { MedleyContributor } from '@/types'

interface ContributorsDisplayProps {
  contributors?: MedleyContributor[]
  lastEditor?: string
  lastEditedAt?: string
  showTitle?: boolean
  compact?: boolean
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

const ContributorsDisplay: React.FC<ContributorsDisplayProps> = ({
  contributors = [],
  lastEditor,
  lastEditedAt,
  showTitle = true,
  compact = false
}) => {
  // Sort contributors by edit count
  const sortedContributors = [...contributors].sort((a, b) => b.editCount - a.editCount)

  const totalEdits = contributors.reduce((sum, c) => sum + c.editCount, 0)

  return (
    <div className={`${compact ? 'bg-gray-50 p-4 rounded-lg' : 'bg-white rounded-xl shadow-sm border border-gray-200 p-6'}`}>
      {showTitle && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-5.197a2.121 2.121 0 00-3-3m3 3a2.121 2.121 0 00-3 3m3-3h.01M9 12h3.75M12 12H15.75" />
            </svg>
            <h3 className={`${compact ? 'text-lg' : 'text-xl'} font-semibold text-gray-900`}>
              コントリビューター
            </h3>
            {contributors.length > 0 && (
              <span className="bg-gradient-to-r from-orange-400 to-orange-500 text-white text-xs font-medium px-2 py-1 rounded-full">
                {contributors.length}
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

      {contributors.length === 0 ? (
        <p className="text-gray-500 text-sm">まだコントリビューターがいません</p>
      ) : (
        <>
          {/* Stats */}
          {!compact && (
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
                <div className="text-sm text-orange-900 font-medium mb-1">総編集回数</div>
                <div className="text-2xl font-bold text-orange-600">{totalEdits}</div>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                <div className="text-sm text-blue-900 font-medium mb-1">貢献者数</div>
                <div className="text-2xl font-bold text-blue-600">{contributors.length}</div>
              </div>
            </div>
          )}

          {/* Contributors list */}
          <div className="space-y-2">
            {sortedContributors.map((contributor, index) => (
              <div
                key={`${contributor.nickname}-${index}`}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold">
                    {contributor.nickname.charAt(0).toUpperCase()}
                  </div>

                  {/* Name and stats */}
                  <div>
                    <div className="font-medium text-gray-900 flex items-center space-x-2">
                      <span>{contributor.nickname}</span>
                      {index === 0 && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                          トップ
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      {contributor.editCount}回編集 · 最終編集: {formatRelativeTime(contributor.lastEdit)}
                    </div>
                  </div>
                </div>

                {/* Edit count badge */}
                <div className="bg-orange-100 text-orange-800 text-sm font-medium px-3 py-1 rounded-full">
                  {contributor.editCount}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

ContributorsDisplay.displayName = 'ContributorsDisplay'

export default ContributorsDisplay
