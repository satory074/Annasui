'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { getUserMedleys } from '@/lib/api/medleys'
import { MedleyData } from '@/types'
import UserAvatar from '@/components/ui/user/UserAvatar'
import AuthModal from '@/components/features/auth/AuthModal'
import AppHeader from '@/components/layout/AppHeader'
import { logger } from '@/lib/utils/logger'

export default function ProfilePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [userMedleys, setUserMedleys] = useState<MedleyData[]>([])
  const [medleysLoading, setMedleysLoading] = useState(true)
  const [showAuthModal, setShowAuthModal] = useState(false)

  useEffect(() => {
    if (loading) return

    if (!user) {
      setShowAuthModal(true)
      return
    }

    const loadUserMedleys = async () => {
      try {
        setMedleysLoading(true)
        const medleys = await getUserMedleys(user.id)
        setUserMedleys(medleys)
      } catch (error) {
        logger.error('Failed to load user medleys:', error)
      } finally {
        setMedleysLoading(false)
      }
    }

    loadUserMedleys()
  }, [user, loading])

  const displayName = user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <>
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              ログインが必要です
            </h1>
            <p className="text-gray-600 mb-6">
              プロフィールページを表示するには、ログインしてください。
            </p>
            <button
              onClick={() => setShowAuthModal(true)}
              className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
            >
              ログイン
            </button>
          </div>
        </div>
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          title="Medlean にログイン"
          description="プロフィールページにアクセスするには、ログインが必要です。"
        />
      </>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 pt-16">
      <AppHeader variant="default" />
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => router.back()}
              className="flex items-center text-gray-600 hover:text-orange-600 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              戻る
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/settings')}
                className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                設定
              </button>
            </div>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            プロフィール
          </h1>
        </div>

        {/* Profile Info Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center space-x-6">
            <UserAvatar user={user} size="xl" />
            <div className="flex-1">
              <h2 className="text-2xl font-semibold text-gray-900 mb-1">
                {displayName}
              </h2>
              <p className="text-gray-600 mb-4">
                {user.email}
              </p>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {medleysLoading ? '-' : userMedleys.length}
                  </div>
                  <div className="text-sm text-gray-600">
                    作成メドレー数
                  </div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-mint-600">
                    {medleysLoading ? '-' : userMedleys.reduce((total, medley) => total + medley.songs.length, 0)}
                  </div>
                  <div className="text-sm text-gray-600">
                    総楽曲数
                  </div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-indigo-600">
                    {new Date(user.created_at || '').toLocaleDateString('ja-JP', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </div>
                  <div className="text-sm text-gray-600">
                    登録日
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contributions Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">
            コントリビューション
          </h3>
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">
              メドレーへの貢献履歴が表示されます
            </div>
            <p className="text-sm text-gray-400">
              メドレーの編集・作成を行うと、ここに表示されるようになります
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}