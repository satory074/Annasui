'use client'

import React, { useState } from 'react'
import { MedleyContributor } from '@/types'

interface ContributorsDisplayProps {
  contributors?: MedleyContributor[]
  lastUpdated?: string
  showTitle?: boolean
  compact?: boolean
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
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
  lastUpdated,
  showTitle = true,
  compact = false 
}) => {
  const [showAll, setShowAll] = useState(false)
  
  // Don't render if no contributors
  if (contributors.length === 0) {
    return null
  }

  // Sort contributors: creators first, then by edit count, then by first contribution
  const sortedContributors = [...contributors].sort((a, b) => {
    if (a.isCreator && !b.isCreator) return -1
    if (!a.isCreator && b.isCreator) return 1
    if (a.editCount !== b.editCount) return b.editCount - a.editCount
    return new Date(a.firstContribution).getTime() - new Date(b.firstContribution).getTime()
  })

  const displayLimit = compact ? 5 : 10
  const visibleContributors = showAll ? sortedContributors : sortedContributors.slice(0, displayLimit)
  const hasMore = sortedContributors.length > displayLimit

  const totalEdits = contributors.reduce((sum, c) => sum + c.editCount, 0)
  const anonymousCount = contributors.filter(c => c.userId === null).length

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
            <span className="bg-gradient-to-r from-orange-400 to-orange-500 text-white text-xs font-medium px-2 py-1 rounded-full">
              {contributors.length}
            </span>
          </div>
          
          {lastUpdated && (
            <div className="text-sm text-gray-500">
              最終更新: {formatRelativeTime(lastUpdated)}
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      {!compact && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <div className="text-2xl font-bold text-orange-600">{contributors.length}</div>
            <div className="text-sm text-orange-700">コントリビューター</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-2xl font-bold text-blue-600">{totalEdits}</div>
            <div className="text-sm text-blue-700">総編集回数</div>
          </div>
          {anonymousCount > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="text-2xl font-bold text-gray-600">{anonymousCount}</div>
              <div className="text-sm text-gray-700">匿名</div>
            </div>
          )}
        </div>
      )}

      {/* Contributors Grid */}
      <div className={`grid ${compact ? 'grid-cols-2 sm:grid-cols-3 gap-3' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4'}`}>
        {visibleContributors.map((contributor, index) => (
          <div
            key={`${contributor.userId || 'anonymous'}-${index}`}
            className="group relative bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md hover:border-orange-300 transition-all duration-200"
          >
            {/* Creator Badge */}
            {contributor.isCreator && (
              <div className="absolute -top-1 -right-1 z-10">
                <span className="bg-gradient-to-r from-orange-400 to-orange-500 text-white text-xs font-medium px-2 py-0.5 rounded-full shadow-sm">
                  作成者
                </span>
              </div>
            )}

            <div className="flex flex-col items-center space-y-2">
              {/* Avatar */}
              <div className="relative">
                {/* Custom Avatar since UserAvatar expects Supabase User type */}
                <div className={`relative w-8 h-8 rounded-full overflow-hidden group-hover:ring-2 group-hover:ring-orange-300 transition-all ${contributor.avatarUrl ? 'bg-gray-200' : 'bg-gradient-to-r from-orange-400 to-orange-500'}`}>
                  {contributor.avatarUrl ? (
                    <img
                      src={contributor.avatarUrl}
                      alt={contributor.name || 'Anonymous'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.nextElementSibling!.className = 'flex items-center justify-center w-full h-full text-white text-sm font-medium bg-gradient-to-r from-orange-400 to-orange-500';
                      }}
                    />
                  ) : null}
                  <div className={`flex items-center justify-center w-full h-full text-white text-sm font-medium ${contributor.avatarUrl ? 'hidden' : ''}`}>
                    {contributor.name ? contributor.name.charAt(0).toUpperCase() : '?'}
                  </div>
                </div>
                
                {/* Edit count badge */}
                <div className="absolute -bottom-1 -right-1 bg-indigo-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-sm">
                  {contributor.editCount}
                </div>
              </div>

              {/* User Info */}
              <div className="text-center min-w-0 w-full">
                <div className="font-medium text-gray-900 text-sm truncate">
                  {contributor.name || '匿名ユーザー'}
                </div>
                <div className="text-xs text-gray-500">
                  {formatRelativeTime(contributor.lastContribution)}
                </div>
              </div>
            </div>

            {/* Tooltip on hover */}
            <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg shadow-lg whitespace-nowrap transition-opacity duration-200 pointer-events-none z-20">
              <div className="font-medium">{contributor.name || '匿名ユーザー'}</div>
              <div>編集回数: {contributor.editCount}回</div>
              <div>初回: {formatRelativeTime(contributor.firstContribution)}</div>
              <div>最終: {formatRelativeTime(contributor.lastContribution)}</div>
              
              {/* Tooltip arrow */}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-800 rotate-45"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Show More/Less Button */}
      {hasMore && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setShowAll(!showAll)}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
          >
            <span>
              {showAll 
                ? '表示を減らす' 
                : `他${sortedContributors.length - displayLimit}人を表示`
              }
            </span>
            <svg 
              className={`w-4 h-4 transition-transform ${showAll ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      )}

      {/* Anonymous note */}
      {anonymousCount > 0 && !compact && (
        <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="text-sm text-gray-600">
              <span className="font-medium">{anonymousCount}人の匿名コントリビューター</span>が編集に参加しています。
              ログインして編集すると、コントリビューターとして表示されます。
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ContributorsDisplay