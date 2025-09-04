"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppHeader from "@/components/layout/AppHeader";

interface PackageJson {
  version: string;
  name: string;
  description?: string;
}

export default function VersionPage() {
  const [packageInfo, setPackageInfo] = useState<PackageJson | null>(null);
  const [changelogContent, setChangelogContent] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVersionInfo = async () => {
      try {
        // package.jsonの情報を取得（静的な値として設定）
        const packageInfo: PackageJson = {
          name: "medlean",
          version: "0.1.0-alpha.1",
          description: "メドレー楽曲アノテーション プラットフォーム"
        };
        setPackageInfo(packageInfo);

        // CHANGELOG.mdの内容を取得（簡略版）
        const changelogContent = `
# Medlean v0.1.0-alpha.1

## 🚀 新機能・主な実装
- **マルチプラットフォーム対応**: ニコニコ動画、YouTube、Spotify、Apple Musicに対応
- **インタラクティブなタイムライン**: ドラッグ&ドロップによる楽曲時間の編集機能
- **楽曲検索システム**: メドレー間を横断した楽曲検索機能
- **ユーザー認証システム**: Google OAuth認証と管理者承認システム
- **レスポンシブデザイン**: モバイル・デスクトップ両対応
- **リアルタイム楽曲表示**: 現在再生中楽曲の自動表示
- **キーボードショートカット**: スペースバー、S/E/Mキー、Ctrl+Z/Yに対応

## 🛠️ 技術スタック
- **Next.js 15.2.1** - App RouterとSSR対応
- **React 19.0.0** - 最新のReact機能活用
- **TailwindCSS 4** - ユーティリティファーストCSS
- **Supabase** - データベースと認証
- **Firebase App Hosting** - SSR対応デプロイ環境
- **TypeScript** - 型安全性の確保

## 🔒 セキュリティ
- Row Level Security (RLS)によるデータベースアクセス制御
- XSS攻撃防止のための入力サニタイズ
- 管理者承認制による編集権限の厳格な管理
- プロダクション環境での安全なログ出力

## ⚠️ アルファ版について
- 現在はアルファ版です。予期しないエラーや不安定な動作が起こる可能性があります
- 一部の機能はプロダクション環境でのみ正常に動作します
- フィードバックやバグ報告をお待ちしています
        `;
        setChangelogContent(changelogContent.trim());

      } catch (error) {
        console.error('バージョン情報の取得に失敗しました:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVersionInfo();
  }, []);

  if (loading) {
    return (
      <>
        <AppHeader variant="default" />
        <div className="min-h-screen pt-16 bg-gradient-to-br from-orange-50 to-indigo-50">
          <div className="max-w-4xl mx-auto p-6">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded mb-4"></div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader variant="default" />
      <div className="min-h-screen pt-16 bg-gradient-to-br from-orange-50 to-indigo-50">
        <div className="max-w-4xl mx-auto p-6">
          {/* ヘッダーセクション */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-orange-400 to-orange-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                V
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-indigo-600 bg-clip-text text-transparent">
                  バージョン情報
                </h1>
                <p className="text-gray-600 mt-1">Medleanの現在のバージョンと変更履歴</p>
              </div>
            </div>
          </div>

          {/* 現在のバージョン情報 */}
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-orange-100">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">現在のバージョン</h2>
                <div className="flex items-center space-x-3">
                  <span className="text-4xl font-bold bg-gradient-to-r from-orange-500 to-indigo-600 bg-clip-text text-transparent">
                    {packageInfo?.version || "取得中..."}
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-orange-400 to-orange-500 text-white">
                    ALPHA
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-gray-600 text-sm">プロジェクト名</p>
                <p className="font-semibold text-lg text-gray-800 capitalize">{packageInfo?.name || "Medlean"}</p>
                <p className="text-gray-500 text-sm mt-1">{packageInfo?.description}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
                <p className="text-orange-700 font-semibold mb-1">リリース日</p>
                <p className="text-orange-600">2025年9月4日</p>
              </div>
              <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 rounded-lg p-4 border border-indigo-200">
                <p className="text-indigo-700 font-semibold mb-1">ステータス</p>
                <p className="text-indigo-600">Alpha Version</p>
              </div>
              <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                <p className="text-green-700 font-semibold mb-1">プラットフォーム</p>
                <p className="text-green-600">Web Application</p>
              </div>
            </div>
          </div>

          {/* 変更履歴 */}
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-orange-100">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <svg className="w-6 h-6 mr-3 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd"/>
              </svg>
              変更履歴
            </h2>
            
            <div className="prose prose-lg max-w-none">
              <div className="bg-gray-50 rounded-lg p-6 font-mono text-sm overflow-x-auto whitespace-pre-line text-gray-800">
                {changelogContent}
              </div>
            </div>
          </div>

          {/* リンクセクション */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <Link href="/" className="bg-white rounded-xl shadow-md p-6 border border-orange-100 hover:shadow-lg transition-shadow group">
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-r from-orange-400 to-orange-500 rounded-lg mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-800 group-hover:text-orange-600 transition-colors">ホームページ</h3>
                <p className="text-gray-600 text-sm mt-1">メドレー一覧に戻る</p>
              </div>
            </Link>

            <a href="https://anasui-e6f49.web.app" target="_blank" rel="noopener noreferrer" className="bg-white rounded-xl shadow-md p-6 border border-indigo-100 hover:shadow-lg transition-shadow group">
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-r from-indigo-400 to-indigo-500 rounded-lg mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.559-.499-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.004 6.004 0 0115.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.559.499.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.497-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.148.748-2.572.837-4.118h1.946a6.004 6.004 0 01-2.783 4.118zm-6.268 0C6.412 13.97 6.118 12.546 6.03 11H4.083a6.004 6.004 0 002.783 4.118z" clipRule="evenodd"/>
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors">プロダクション</h3>
                <p className="text-gray-600 text-sm mt-1">本番環境を開く</p>
              </div>
            </a>

            <a href="https://github.com/anthropics/claude-code/issues" target="_blank" rel="noopener noreferrer" className="bg-white rounded-xl shadow-md p-6 border border-green-100 hover:shadow-lg transition-shadow group">
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-green-500 rounded-lg mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-800 group-hover:text-green-600 transition-colors">フィードバック</h3>
                <p className="text-gray-600 text-sm mt-1">バグ報告・要望</p>
              </div>
            </a>
          </div>

          {/* 詳細な変更履歴リンク */}
          <div className="mt-8 text-center">
            <p className="text-gray-600 mb-4">詳細な変更履歴は以下のファイルで確認できます</p>
            <div className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm">
              <svg className="w-4 h-4 mr-2 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"/>
              </svg>
              <span className="font-mono text-sm text-gray-700">CHANGELOG.md</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}