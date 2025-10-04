'use client'

import React, { createContext, useContext } from 'react'

// Simplified AuthContext - authentication system has been removed
// This context is kept for backwards compatibility but all auth features are disabled

interface AuthContextType {
  user: null
  session: null
  loading: false
  isApproved: false
  approvalLoading: false
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
  // Return a static context with no authentication
  // All users are anonymous with no approval system
  const value: AuthContextType = {
    user: null,
    session: null,
    loading: false,
    isApproved: false,
    approvalLoading: false
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
