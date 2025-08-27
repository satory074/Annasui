import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ErrorBoundary from "@/components/ErrorBoundary";
import ClientLayout from "@/components/ClientLayout";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ニコニコメドレーアノテーションプレイヤー",
  description: "ニコニコ動画のメドレー楽曲に詳細なアノテーション情報を提供するWebアプリケーション。Songleスタイルのタイムライン表示で、楽曲ごとの時間情報と詳細情報を確認できます。",
  keywords: ["ニコニコ動画", "メドレー", "アノテーション", "楽曲情報", "タイムライン"],
  authors: [{ name: "Anasui Team" }],
  creator: "Anasui Team",
  openGraph: {
    title: "ニコニコメドレーアノテーションプレイヤー",
    description: "ニコニコ動画のメドレー楽曲に詳細なアノテーション情報を提供するWebアプリケーション",
    url: "https://anasui.netlify.app",
    siteName: "ニコニコメドレーアノテーションプレイヤー",
    type: "website",
    locale: "ja_JP",
  },
  twitter: {
    card: "summary_large_image",
    title: "ニコニコメドレーアノテーションプレイヤー",
    description: "ニコニコ動画のメドレー楽曲に詳細なアノテーション情報を提供するWebアプリケーション",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ClientLayout>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </ClientLayout>
      </body>
    </html>
  );
}
