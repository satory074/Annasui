'use client'

import React from 'react'
import { User } from '@supabase/supabase-js'

interface UserAvatarProps {
  user: User | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function UserAvatar({ user, size = 'md', className = '' }: UserAvatarProps) {
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-12 h-12 text-lg'
  }

  const avatarUrl = user?.user_metadata?.avatar_url
  const name = user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email
  const initials = name
    ? name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name || 'User avatar'}
        className={`${sizeClasses[size]} rounded-full object-cover ${className}`}
        onError={(e) => {
          // Fallback to initials if image fails to load
          const target = e.target as HTMLImageElement
          target.style.display = 'none'
          const fallback = target.nextElementSibling as HTMLDivElement
          if (fallback) {
            fallback.style.display = 'flex'
          }
        }}
      />
    )
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-caramel-600 text-white font-semibold flex items-center justify-center ${className}`}
    >
      {initials}
    </div>
  )
}