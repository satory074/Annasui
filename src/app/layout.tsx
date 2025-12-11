import type { Metadata } from "next";
import { Fraunces } from "next/font/google";
import { Onest } from "next/font/google";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";
import ErrorBoundary from "@/components/ErrorBoundary";
import ClientLayout from "@/components/ClientLayout";

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
});

const onest = Onest({
  variable: "--font-ui",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-accent",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Medlean - ニコニコメドレーアノテーションプレイヤー",
  description: "ニコニコ動画のメドレー楽曲に詳細なアノテーション情報を提供するWebアプリケーション。Songleスタイルのタイムライン表示で、楽曲ごとの時間情報と詳細情報を確認できます。",
  keywords: ["ニコニコ動画", "メドレー", "アノテーション", "楽曲情報", "タイムライン", "ニコニコメドレー", "音楽", "Medlean"],
  authors: [{ name: "Medlean Team" }],
  creator: "Medlean Team",
  metadataBase: new URL('https://anasui-e6f49.web.app'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "Medlean - ニコニコメドレーアノテーションプレイヤー",
    description: "ニコニコ動画のメドレー楽曲に詳細なアノテーション情報を提供するWebアプリケーション。楽曲の詳細なタイムライン表示と編集機能で、メドレーをより深く楽しめます。",
    url: "https://anasui-e6f49.web.app",
    siteName: "Medlean",
    type: "website",
    locale: "ja_JP",
    images: [
      {
        url: '/icons/apple-icon-180x180.png',
        width: 180,
        height: 180,
        alt: 'Medlean - メドレーアノテーションプレイヤー',
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Medlean - ニコニコメドレーアノテーションプレイヤー",
    description: "ニコニコ動画のメドレー楽曲に詳細なアノテーション情報を提供するWebアプリケーション",
    images: ['/icons/apple-icon-180x180.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
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
