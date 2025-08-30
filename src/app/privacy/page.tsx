import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'プライバシーポリシー | Anasui',
  description: 'Anasui（ニコニコメドレーアノテーションプレイヤー）のプライバシーポリシーです。',
}

export default function PrivacyPage() {
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">プライバシーポリシー</h1>
          
          <div className="prose prose-gray dark:prose-invert max-w-none">
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
              最終更新日：2025年8月30日
            </p>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">1. 収集する情報</h2>
              <div className="text-gray-700 dark:text-gray-300 mb-4">
                <p className="mb-4">本サービスでは、以下の情報を収集いたします：</p>
                
                <h3 className="text-lg font-medium mb-2">アカウント情報</h3>
                <ul className="list-disc list-inside ml-4 space-y-1 mb-4">
                  <li>GitHub または Google アカウントから提供される基本情報（ユーザー名、メールアドレス、プロフィール画像など）</li>
                  <li>OAuth認証時に提供される一意の識別子</li>
                </ul>

                <h3 className="text-lg font-medium mb-2">利用情報</h3>
                <ul className="list-disc list-inside ml-4 space-y-1 mb-4">
                  <li>作成・編集されたメドレーデータ</li>
                  <li>楽曲情報やタイムライン設定</li>
                  <li>サービスの利用履歴（アクセスログ、操作履歴など）</li>
                </ul>

                <h3 className="text-lg font-medium mb-2">技術情報</h3>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>IPアドレス、ブラウザ情報、デバイス情報</li>
                  <li>Cookie、ローカルストレージに保存される設定情報（ダークモード設定など）</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">2. 情報の利用目的</h2>
              <div className="text-gray-700 dark:text-gray-300 mb-4">
                <p className="mb-2">収集した情報は、以下の目的で利用いたします：</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>本サービスの提供・運営</li>
                  <li>ユーザーアカウントの管理・認証</li>
                  <li>データの保存・同期</li>
                  <li>サービス改善のための分析</li>
                  <li>技術的なサポート・トラブルシューティング</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">3. 情報の第三者提供</h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                本サービスは、法令に基づく場合を除き、利用者の同意なく個人情報を第三者に提供することはありません。
                ただし、本サービスの運営に必要な以下のサービスとデータを共有する場合があります：
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1 text-gray-700 dark:text-gray-300">
                <li>Supabase（データベース・認証サービス）</li>
                <li>Firebase（ホスティングサービス）</li>
                <li>GitHub・Google（OAuth認証プロバイダー）</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">4. データの保存・削除</h2>
              <div className="text-gray-700 dark:text-gray-300 mb-4">
                <p className="mb-4">
                  利用者データは、Supabaseのセキュアなデータベースに保存されます。
                  アカウント削除を希望される場合は、GitHubリポジトリのIssuesからご連絡ください。
                </p>
                <p>
                  アルファ版期間中は、予告なくデータベースのメンテナンスやリセットが行われる場合があります。
                  重要なデータは別途バックアップを取られることをお勧めします。
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">5. セキュリティ</h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                本サービスは、利用者の個人情報を適切に保護するため、技術的・組織的なセキュリティ対策を講じています。
                ただし、インターネット上でのデータ送信には完全なセキュリティを保証することはできません。
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">6. Cookie・ローカルストレージについて</h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                本サービスでは、利便性向上のため以下の技術を使用しています：
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1 text-gray-700 dark:text-gray-300">
                <li>認証状態の管理</li>
                <li>ダークモード設定の保存</li>
                <li>一時的な操作データの保持</li>
              </ul>
              <p className="text-gray-700 dark:text-gray-300 mt-4">
                これらの機能は、ブラウザの設定により無効化することができますが、
                一部の機能が正常に動作しない場合があります。
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">7. プライバシーポリシーの変更</h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                本プライバシーポリシーは、法令の改正やサービス機能の変更等により、
                予告なく変更される場合があります。変更後のプライバシーポリシーは、
                本ページに掲載された時点で効力を生じるものとします。
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">8. お問い合わせ</h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                本プライバシーポリシーに関するお問い合わせは、
                GitHubリポジトリのIssuesからお願いいたします。
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}