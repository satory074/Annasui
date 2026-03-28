import { Metadata } from 'next'
import PrivacyPageClient from '@/components/pages/PrivacyPageClient'

export const metadata: Metadata = {
  title: 'プライバシーポリシー | Medlean',
  description: 'Medlean（メドレーアノテーションプラットフォーム）のプライバシーポリシーです。',
}

export const dynamic = "force-dynamic"

export default function PrivacyPage() {
  return <PrivacyPageClient />
}
