'use client'

import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import BaseModal from '@/components/ui/modal/BaseModal'
import { logger } from '@/lib/utils/logger'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
}

export default function AuthModal({ 
  isOpen, 
  onClose, 
  title = "ログインが必要です", 
  description = "この機能を使用するには、ログインが必要です。" 
}: AuthModalProps) {
  const { signIn, loading } = useAuth()
  const [signingIn, setSigningIn] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSignIn = async (provider: 'google') => {
    setSigningIn(true)
    setError(null)
    
    try {
      await signIn(provider)
      // The OAuth flow will redirect, so we don't need to close the modal here
    } catch (err) {
      logger.error('Sign in error:', err)
      setError(err instanceof Error ? err.message : '認証エラーが発生しました')
      setSigningIn(false)
    }
  }

  const handleClose = () => {
    if (!signingIn) {
      setError(null)
      onClose()
    }
  }

  return (
    <BaseModal isOpen={isOpen} onClose={handleClose} maxWidth="md">
      <div className="p-6">
        <div className="text-center mb-6">
          <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-orange-100 mb-4">
            <svg 
              className="w-6 h-6 text-orange-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {title}
          </h3>
          <p className="text-sm text-gray-600">
            {description}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">
              {error}
            </p>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={() => handleSignIn('google')}
            disabled={signingIn || loading}
            className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {signingIn ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                認証中...
              </div>
            ) : (
              <>
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google でログイン
              </>
            )}
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            ログインすることで、{' '}
            <a href="/terms" className="text-orange-600 hover:underline">
              利用規約
            </a>{' '}
            と{' '}
            <a href="/privacy" className="text-orange-600 hover:underline">
              プライバシーポリシー
            </a>{' '}
            に同意したものとみなします。
          </p>
        </div>

        {!signingIn && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              キャンセル
            </button>
          </div>
        )}
      </div>
    </BaseModal>
  )
}