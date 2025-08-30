import React from 'react'
import { Metadata } from 'next'
import MyMedleysPage from '@/components/pages/MyMedleysPage'

export const metadata: Metadata = {
  title: 'マイメドレー - Medlean',
  description: 'あなたが作成したメドレー一覧'
}

export default function MyMedleys() {
  return <MyMedleysPage />
}