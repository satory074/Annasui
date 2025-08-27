import React from 'react'
import { Metadata } from 'next'
import ProfilePage from '@/components/pages/ProfilePage'

export const metadata: Metadata = {
  title: 'プロフィール - Anasui',
  description: 'ユーザープロフィール'
}

export default function Profile() {
  return <ProfilePage />
}