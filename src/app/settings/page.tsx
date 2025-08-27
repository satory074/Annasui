import React from 'react'
import { Metadata } from 'next'
import SettingsPage from '@/components/pages/SettingsPage'

export const metadata: Metadata = {
  title: '設定 - Anasui',
  description: 'アカウント設定と表示設定'
}

export default function Settings() {
  return <SettingsPage />
}