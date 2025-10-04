'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { logger } from '@/lib/utils/logger'

/**
 * AuthContext with password-based authentication
 *
 * Features:
 * - Simple password authentication (shared password)
 * - Nickname tracking for contributors
 * - Session persistence via sessionStorage
 * - No user registration required
 */

interface AuthContextType {
  isAuthenticated: boolean
  nickname: string | null
  loading: boolean
  login: (nickname: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

const SESSION_KEY = 'medlean_auth'

interface SessionData {
  nickname: string
  authenticatedAt: number
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [nickname, setNickname] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Load authentication state from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY)
      if (stored) {
        const data: SessionData = JSON.parse(stored)

        // Validate session (optional: add expiration check)
        if (data.nickname && data.nickname.trim().length > 0) {
          setNickname(data.nickname)
          setIsAuthenticated(true)
          logger.info('🔑 Restored authentication session for:', data.nickname)
        }
      }
    } catch (error) {
      logger.error('Error restoring authentication session:', error)
      sessionStorage.removeItem(SESSION_KEY)
    } finally {
      setLoading(false)
    }
  }, [])

  // Login function
  const login = useCallback(async (inputNickname: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Validate inputs
      const trimmedNickname = inputNickname.trim()
      if (!trimmedNickname) {
        return { success: false, error: 'ニックネームを入力してください' }
      }

      if (trimmedNickname.length > 50) {
        return { success: false, error: 'ニックネームは50文字以内で入力してください' }
      }

      if (!password) {
        return { success: false, error: 'パスワードを入力してください' }
      }

      logger.info('🔐 Attempting login for nickname:', trimmedNickname)

      // Call API to verify password
      const response = await fetch('/api/auth/verify-password/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nickname: trimmedNickname,
          password: password
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Save to state
        setNickname(trimmedNickname)
        setIsAuthenticated(true)

        // Save to sessionStorage
        const sessionData: SessionData = {
          nickname: trimmedNickname,
          authenticatedAt: Date.now()
        }
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionData))

        logger.info('✅ Login successful for:', trimmedNickname)
        return { success: true }
      }

      // Handle specific error cases
      if (response.status === 429) {
        logger.warn('⚠️ Rate limit exceeded for login attempt')
        return { success: false, error: '試行回数が多すぎます。しばらく待ってから再度お試しください。' }
      }

      if (response.status === 401) {
        logger.warn('⚠️ Invalid password for nickname:', trimmedNickname)
        return { success: false, error: 'パスワードが正しくありません' }
      }

      logger.error('❌ Login failed:', data.error || 'Unknown error')
      return { success: false, error: data.error || 'ログインに失敗しました' }

    } catch (error) {
      logger.error('❌ Login error:', error)
      return { success: false, error: 'ネットワークエラーが発生しました' }
    }
  }, [])

  // Logout function
  const logout = useCallback(() => {
    setNickname(null)
    setIsAuthenticated(false)
    sessionStorage.removeItem(SESSION_KEY)
    logger.info('🔓 User logged out')
  }, [])

  const value: AuthContextType = {
    isAuthenticated,
    nickname,
    loading,
    login,
    logout
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
