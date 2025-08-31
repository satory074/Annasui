'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import UserAvatar from '@/components/ui/user/UserAvatar'
import AuthModal from '@/components/features/auth/AuthModal'
import AppHeader from '@/components/layout/AppHeader'
import { logger } from '@/lib/utils/logger'

export default function SettingsPage() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

  // Check authentication
  useEffect(() => {
    if (loading) return

    if (!user) {
      setShowAuthModal(true)
      return
    }
  }, [user, loading])

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      await signOut()
      router.push('/')
    } catch (error) {
      logger.error('Sign out error:', error)
    } finally {
      setIsSigningOut(false)
    }
  }

  const displayName = user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0]
  const provider = user?.app_metadata?.provider
  const providerIcon = <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>

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
              設定ページを表示するには、ログインしてください。
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
          description="設定ページにアクセスするには、ログインが必要です。"
        />
      </>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <AppHeader variant="default" />
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
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
          </div>

          <p className="text-gray-600">
            アカウント設定を管理
          </p>
        </div>

        <div className="space-y-6">
          {/* Account Settings */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                アカウント
              </h2>
              <p className="text-sm text-gray-600">
                ログイン情報とプロフィール設定
              </p>
            </div>
            
            <div className="p-6">
              <div className="flex items-center space-x-4">
                <UserAvatar
                  user={user}
                  size="lg"
                />
                
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900">
                    {displayName}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {user.email}
                  </p>
                  <div className="flex items-center mt-2">
                    {providerIcon}
                    <span className="ml-2 text-xs text-gray-500 capitalize">
                      {provider} でログイン
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="flex items-center px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  {isSigningOut ? 'ログアウト中...' : 'ログアウト'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}