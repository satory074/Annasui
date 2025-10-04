'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '@/components/layout/AppHeader'

export default function ProfilePage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-100 pt-16">
      <AppHeader variant="default" />
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => router.back()}
              className="flex items-center text-gray-600 hover:text-orange-600 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              戻る
            </button>
            <h1 className="text-3xl font-bold text-gray-900">
              プロフィール
            </h1>
          </div>
        </div>

        {/* Info Message */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              プロフィールページ
            </h2>
            <p className="text-gray-600 mb-6">
              このページはユーザープロフィール表示用です
            </p>
            <button
              onClick={() => router.push('/')}
              className="inline-flex items-center px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              ホームへ戻る
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}