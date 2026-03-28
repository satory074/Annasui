import { Metadata } from 'next'
import TermsPageClient from '@/components/pages/TermsPageClient'

export const metadata: Metadata = {
  title: '利用規約 | Medlean',
  description: 'Medlean（メドレーアノテーションプラットフォーム）の利用規約です。',
}

export const dynamic = "force-dynamic"

export default function TermsPage() {
  return <TermsPageClient />
}
