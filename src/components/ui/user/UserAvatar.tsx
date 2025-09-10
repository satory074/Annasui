'use client'

import React from 'react'
import Image from 'next/image'
import { User } from '@supabase/supabase-js'

interface UserAvatarProps {
  user: User | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export default function UserAvatar({ user, size = 'md', className = '' }: UserAvatarProps) {
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl'
  }

  const avatarUrl = user?.user_metadata?.avatar_url
  const name = user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email
  const initials = name
    ? name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  if (avatarUrl) {
    return (
      <div className={`${sizeClasses[size]} relative rounded-full overflow-hidden ${className}`}>
        <Image
          src={avatarUrl}
          alt={name || 'User avatar'}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 40px, 48px"
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
      </div>
    )
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-orange-600 text-white font-semibold flex items-center justify-center ${className}`}
    >
      {initials}
    </div>
  )
}