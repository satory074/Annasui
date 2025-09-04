"use client";

import { useState } from "react";

interface VersionInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function VersionInfoModal({ isOpen, onClose }: VersionInfoModalProps) {
  if (!isOpen) return null;

  const packageInfo = {
    name: "medlean",
    version: "0.1.0-alpha.1",
    description: "メドレー楽曲アノテーション プラットフォーム"
  };

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
  `.trim();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[200]">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-orange-100">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-orange-400 to-orange-500 rounded-lg flex items-center justify-center text-white font-bold">
              V
            </div>
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-indigo-600 bg-clip-text text-transparent">
                バージョン情報
              </h2>
              <p className="text-gray-600 text-sm">Medleanの現在のバージョンと変更履歴</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {/* 現在のバージョン情報 */}
          <div className="bg-gradient-to-r from-orange-50 to-indigo-50 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">現在のバージョン</h3>
                <div className="flex items-center space-x-3">
                  <span className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-indigo-600 bg-clip-text text-transparent">
                    {packageInfo.version}
                  </span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-orange-400 to-orange-500 text-white">
                    ALPHA
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-gray-600 text-sm">プロジェクト名</p>
                <p className="font-semibold text-lg text-gray-800 capitalize">{packageInfo.name}</p>
                <p className="text-gray-500 text-sm mt-1">{packageInfo.description}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-white bg-opacity-60 rounded-lg p-3 border border-orange-200">
                <p className="text-orange-700 font-semibold text-sm mb-1">リリース日</p>
                <p className="text-orange-600 text-sm">2025年9月4日</p>
              </div>
              <div className="bg-white bg-opacity-60 rounded-lg p-3 border border-indigo-200">
                <p className="text-indigo-700 font-semibold text-sm mb-1">ステータス</p>
                <p className="text-indigo-600 text-sm">Alpha Version</p>
              </div>
              <div className="bg-white bg-opacity-60 rounded-lg p-3 border border-green-200">
                <p className="text-green-700 font-semibold text-sm mb-1">プラットフォーム</p>
                <p className="text-green-600 text-sm">Web Application</p>
              </div>
            </div>
          </div>

          {/* 変更履歴 */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd"/>
              </svg>
              変更履歴
            </h3>
            
            <div className="bg-white rounded-lg p-4 font-mono text-xs overflow-x-auto whitespace-pre-line text-gray-800">
              {changelogContent}
            </div>
          </div>

          {/* リンクセクション */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <a href="https://anasui-e6f49.web.app" target="_blank" rel="noopener noreferrer" className="flex items-center p-3 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors">
              <div className="w-8 h-8 bg-gradient-to-r from-indigo-400 to-indigo-500 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.559-.499-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.004 6.004 0 0115.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.559.499.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.497-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.148.748-2.572.837-4.118h1.946a6.004 6.004 0 01-2.783 4.118zm-6.268 0C6.412 13.97 6.118 12.546 6.03 11H4.083a6.004 6.004 0 002.783 4.118z" clipRule="evenodd"/>
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800">プロダクション環境</h4>
                <p className="text-gray-600 text-sm">本番環境を開く</p>
              </div>
            </a>

            <a href="https://github.com/anthropics/claude-code/issues" target="_blank" rel="noopener noreferrer" className="flex items-center p-3 bg-white border border-green-200 rounded-lg hover:bg-green-50 transition-colors">
              <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-green-500 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800">フィードバック</h4>
                <p className="text-gray-600 text-sm">バグ報告・要望</p>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}