'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/utils/logger'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const handleAuthCallback = async () => {
      if (!supabase) {
        logger.warn('⚠️ Supabase client not available')
        router.push('/')
        return
      }

      try {
        // Handle the auth callback
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          logger.error('❌ Auth callback error:', error)
        } else if (data.session) {
          logger.info('✅ Authentication successful:', data.session.user.email)
        }
        
        // Redirect to home page
        router.push('/')
      } catch (error) {
        logger.error('Auth callback processing error:', error)
        router.push('/')
      }
    }

    handleAuthCallback()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
        <p className="text-gray-600">
          認証を処理中...
        </p>
      </div>
    </div>
  )
}