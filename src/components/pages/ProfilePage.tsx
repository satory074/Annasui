'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { getUserMedleys } from '@/lib/api/medleys'
import { MedleyData } from '@/types'
import UserAvatar from '@/components/ui/user/UserAvatar'
import AuthModal from '@/components/features/auth/AuthModal'

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
        console.error('Failed to load user medleys:', error)
      } finally {
        setMedleysLoading(false)
      }
    }

    loadUserMedleys()
  }, [user, loading])

  const displayName = user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0]

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}分${remainingSeconds}秒`
  }

  const getMedleyUrl = (medley: MedleyData) => {
    const platform = medley.platform || 'niconico'
    return `/${platform}/${medley.videoId}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <>
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              ログインが必要です
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
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
          title="Anasui にログイン"
          description="プロフィールページにアクセスするには、ログインが必要です。"
        />
      </>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => router.back()}
              className="flex items-center text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-caramel-400 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              戻る
            </button>
            <button
              onClick={() => router.push('/settings')}
              className="flex items-center px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              設定
            </button>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            プロフィール
          </h1>
        </div>

        {/* Profile Info Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
          <div className="flex items-center space-x-6">
            <UserAvatar user={user} size="xl" />
            <div className="flex-1">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">
                {displayName}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {user.email}
              </p>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600 dark:text-caramel-400">
                    {medleysLoading ? '-' : userMedleys.length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    作成メドレー数
                  </div>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="text-2xl font-bold text-mint-600">
                    {medleysLoading ? '-' : userMedleys.reduce((total, medley) => total + medley.songs.length, 0)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    総楽曲数
                  </div>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="text-2xl font-bold text-indigo-600">
                    {new Date(user.created_at || '').toLocaleDateString('ja-JP', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    登録日
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* My Medleys Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              マイメドレー
            </h3>
            <button
              onClick={() => router.push('/my-medleys')}
              className="text-orange-600 hover:text-orange-700 dark:text-caramel-400 dark:hover:text-caramel-300 text-sm font-medium transition-colors"
            >
              すべて表示 →
            </button>
          </div>

          {medleysLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
            </div>
          ) : userMedleys.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500 dark:text-gray-400 mb-4">
                まだメドレーを作成していません
              </div>
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
              >
                メドレーを作成する
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {userMedleys.slice(0, 6).map((medley) => (
                <div
                  key={medley.id}
                  className="group bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden hover:shadow-md transition-all duration-200"
                >
                  <a href={getMedleyUrl(medley)} className="block">
                    <div className="aspect-video bg-gray-200 dark:bg-gray-600 relative overflow-hidden">
                      {medley.platform === 'youtube' ? (
                        <img
                          src={`https://img.youtube.com/vi/${medley.videoId}/maxresdefault.jpg`}
                          alt={medley.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.src = `https://img.youtube.com/vi/${medley.videoId}/hqdefault.jpg`
                          }}
                        />
                      ) : (
                        <img
                          src={`https://tn.smilevideo.jp/smile?i=${medley.videoId.replace('sm', '')}`}
                          alt={medley.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                          }}
                        />
                      )}
                      
                      <div className="absolute top-2 left-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded text-white ${
                          medley.platform === 'youtube' 
                            ? 'bg-red-600/90' 
                            : 'bg-orange-600/90'
                        } backdrop-blur-sm`}>
                          {medley.platform === 'youtube' ? 'YouTube' : 'ニコニコ'}
                        </span>
                      </div>
                      
                      <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm text-white text-xs px-2 py-1 rounded font-medium">
                        {formatDuration(medley.duration)}
                      </div>
                    </div>
                    
                    <div className="p-3">
                      <h4 className="font-medium text-gray-900 dark:text-white text-sm line-clamp-2 group-hover:text-orange-600 dark:group-hover:text-caramel-400 transition-colors">
                        {medley.title}
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {medley.songs.length}曲 • {formatDuration(medley.duration)}
                      </p>
                    </div>
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}