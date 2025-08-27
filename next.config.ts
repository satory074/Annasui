import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true,
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
        pathname: '/vi/**',
      },
      {
        protocol: 'https',
        hostname: 'nicovideo.cdn.nimg.jp',
        pathname: '/thumbnails/**',
      }
    ]
  },
  eslint: {
    // ビルド時にESLintエラーを無視（本番環境でのテスト用）
    ignoreDuringBuilds: true,
  }
};

export default nextConfig;
