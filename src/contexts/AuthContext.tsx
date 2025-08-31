'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'
import { logger } from '@/lib/utils/logger'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  isApproved: boolean
  approvalLoading: boolean
  checkApprovalStatus: () => Promise<void>
  signIn: (provider: 'google') => Promise<void>
  signOut: () => Promise<void>
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

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [isApproved, setIsApproved] = useState(false)
  const [approvalLoading, setApprovalLoading] = useState(false)

  // Handle client-side mounting
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    // Only initialize auth if Supabase is available and component is mounted
    if (!supabase) {
      logger.warn('⚠️ Supabase client not available, auth features disabled')
      setLoading(false)
      return
    }

    if (!mounted) {
      return
    }

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase!.auth.getSession()
        if (error) {
          logger.error('Error getting initial session:', error)
        } else {
          setSession(session)
          setUser(session?.user ?? null)
          logger.info('📱 Initial auth session:', session?.user ? 'authenticated' : 'anonymous')
        }
      } catch (error) {
        logger.error('Error in getInitialSession:', error)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth state changes
    const { data: { subscription } } = supabase!.auth.onAuthStateChange((event, session) => {
      logger.info('🔄 Auth state changed:', event, session?.user ? 'authenticated' : 'anonymous')
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [mounted])

  const checkApprovalStatus = async () => {
    if (!supabase || !user) {
      setIsApproved(false)
      return
    }

    try {
      setApprovalLoading(true)
      logger.debug('🔍 Checking user approval status for:', user.id)

      const { data, error } = await supabase
        .from('approved_users')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        logger.error('❌ Error checking approval status:', error)
        setIsApproved(false)
        return
      }

      const approved = !!data
      setIsApproved(approved)
      logger.info(approved ? '✅ User is approved' : '⏳ User is not approved')
    } catch (error) {
      logger.error('❌ Error in checkApprovalStatus:', error)
      setIsApproved(false)
    } finally {
      setApprovalLoading(false)
    }
  }

  // Check approval status when user changes
  useEffect(() => {
    if (user && !loading) {
      checkApprovalStatus()
    } else {
      setIsApproved(false)
    }
  }, [user, loading])

  const signIn = async (provider: 'google') => {
    if (!supabase) {
      logger.warn('⚠️ Authentication unavailable: Supabase client not configured')
      return
    }

    try {
      logger.info(`🔐 Attempting to sign in with ${provider}...`)
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (error) {
        logger.error(`❌ Error signing in with ${provider}:`, error)
        throw error
      }
    } catch (error) {
      logger.error('Sign in error:', error)
      throw error
    }
  }

  const signOut = async () => {
    if (!supabase) {
      logger.warn('⚠️ Sign out unavailable: Supabase client not configured')
      return
    }

    try {
      logger.info('🚪 Signing out...')
      const { error } = await supabase.auth.signOut()
      if (error) {
        logger.error('❌ Error signing out:', error)
        throw error
      }
      logger.info('✅ Signed out successfully')
    } catch (error) {
      logger.error('Sign out error:', error)
      throw error
    }
  }

  const value: AuthContextType = {
    user,
    session,
    loading,
    isApproved,
    approvalLoading,
    checkApprovalStatus,
    signIn,
    signOut
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}