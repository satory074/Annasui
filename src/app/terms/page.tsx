import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '利用規約 | Anasui',
  description: 'Anasui（ニコニコメドレーアノテーションプレイヤー）の利用規約です。',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link 
            href="/" 
            className="inline-flex items-center text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 transition-colors"
          >
            <svg className="h-5 w-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            ホームに戻る
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">利用規約</h1>
          
          <div className="prose prose-gray dark:prose-invert max-w-none">
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
              最終更新日：2025年8月30日
            </p>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">第1条（適用）</h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                本利用規約（以下「本規約」）は、Anasui（ニコニコメドレーアノテーションプレイヤー）（以下「本サービス」）の利用条件を定めるものです。
                本サービスをご利用いただくすべてのユーザー（以下「利用者」）には、本規約に同意していただく必要があります。
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">第2条（利用登録）</h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                本サービスでは、GitHub または Google アカウントを使用したログインが可能です。
                ログインすることで、メドレーデータの作成・編集機能をご利用いただけます。
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">第3条（利用者の責務）</h2>
              <div className="text-gray-700 dark:text-gray-300 mb-4">
                <p className="mb-2">利用者は、以下の行為を行ってはなりません：</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>他者の著作権、商標権その他の知的財産権を侵害する行為</li>
                  <li>他者の名誉、信用、プライバシーを侵害する行為</li>
                  <li>虚偽の情報を登録する行為</li>
                  <li>本サービスの運営を妨害する行為</li>
                  <li>その他、法令に違反する行為</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">第4条（コンテンツについて）</h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                本サービスで扱うメドレーデータや楽曲情報は、各プラットフォーム（ニコニコ動画、YouTube、Spotify、Apple Music等）の利用規約に従って利用してください。
                本サービスは、これらの外部サービスとの間接的な連携を提供するものであり、各プラットフォームのコンテンツの権利については関与いたしません。
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">第5条（免責事項）</h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                本サービスはアルファ版として提供されており、予告なく仕様変更や機能追加・削除が行われる場合があります。
                本サービスの利用により発生したいかなる損害についても、運営者は一切の責任を負いません。
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">第6条（規約の変更）</h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                本規約は、必要に応じて変更される場合があります。
                変更後の利用規約は、本ページに掲載された時点で効力を生じるものとします。
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">お問い合わせ</h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                本規約に関するお問い合わせは、GitHubリポジトリの Issues からお願いいたします。
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}