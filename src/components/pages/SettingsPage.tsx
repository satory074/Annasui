'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '@/components/layout/AppHeader'

export default function SettingsPage() {
  const router = useRouter()
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)

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
              設定
            </h1>
          </div>

          <p className="text-gray-600">
            アプリケーション設定
          </p>
        </div>

        <div className="space-y-6">
          {/* General Settings */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                一般設定
              </h2>
              <p className="text-sm text-gray-600">
                アプリケーションの動作設定
              </p>
            </div>

            <div className="p-6 space-y-4">
              {/* Auto-save setting */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">
                    自動保存
                  </h3>
                  <p className="text-sm text-gray-600">
                    編集内容を自動的に保存します
                  </p>
                </div>
                <button
                  onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-600 focus:ring-offset-2 ${
                    autoSaveEnabled ? 'bg-orange-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      autoSaveEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Notifications setting */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">
                    通知
                  </h3>
                  <p className="text-sm text-gray-600">
                    システム通知を有効にします
                  </p>
                </div>
                <button
                  onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-600 focus:ring-offset-2 ${
                    notificationsEnabled ? 'bg-orange-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      notificationsEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* About */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                このアプリについて
              </h2>
            </div>

            <div className="p-6">
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>バージョン</span>
                  <span className="font-medium text-gray-900">v0.1.0-alpha.1</span>
                </div>
                <div className="flex justify-between">
                  <span>プラットフォーム</span>
                  <span className="font-medium text-gray-900">Next.js 15.2.1</span>
                </div>
                <div className="pt-3 border-t border-gray-200">
                  <p className="text-gray-600">
                    Medlean - マルチプラットフォームメドレーアノテーションツール
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}