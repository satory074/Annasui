import React from 'react'
import { Skeleton } from './Skeleton'

export function PlayerSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="space-y-2">
          <Skeleton height="h-8" width="w-3/4" />
          <div className="flex items-center space-x-4">
            <Skeleton height="h-4" width="w-24" />
            <Skeleton height="h-4" width="w-16" />
            <Skeleton height="h-4" width="w-20" />
          </div>
        </div>

        {/* Player skeleton */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="aspect-video bg-gray-200 rounded-lg animate-pulse mb-4"></div>
          
          {/* Controls skeleton */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Skeleton height="h-10" width="w-10" rounded />
              <Skeleton height="h-6" width="w-32" />
            </div>
            <div className="flex items-center space-x-2">
              <Skeleton height="h-8" width="w-16" />
              <Skeleton height="h-8" width="w-16" />
            </div>
          </div>
        </div>

        {/* Timeline skeleton */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <Skeleton height="h-6" width="w-32" />
            <Skeleton height="h-8" width="w-24" />
          </div>
          
          {/* Timeline bars */}
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="flex items-center space-x-4">
                <Skeleton height="h-12" width="w-12" rounded />
                <div className="flex-1">
                  <Skeleton height="h-4" width="w-2/3" className="mb-1" />
                  <Skeleton height="h-3" width="w-1/2" />
                </div>
                <Skeleton height="h-6" width="w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function PlayerLoadingMessage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        {/* Loading spinner */}
        <div className="relative mb-6">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-orange-500 rounded-full animate-spin mx-auto"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 bg-orange-500 rounded-full animate-pulse"></div>
          </div>
        </div>
        
        {/* Messages */}
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          読み込み中...
        </h2>
        
        <p className="text-gray-600 mb-4">
          ニコニコ楽曲アノテーションプレイヤーを準備しています
        </p>
        
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center justify-center mb-2">
            <svg className="w-5 h-5 text-orange-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium text-orange-800">アルファ版</span>
          </div>
          <p className="text-sm text-orange-700">
            初回読み込みに時間がかかる場合があります。
          </p>
        </div>
      </div>
    </div>
  )
}