import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true,
  images: {
    unoptimized: false,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ['image/webp'],
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
      },
      {
        protocol: 'https',
        hostname: 'tn.smilevideo.jp',
        pathname: '/smile/**',
      },
      {
        protocol: 'https',
        hostname: 'i.scdn.co',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.mzstatic.com',
        pathname: '/**',
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Server-side env vars (not exposed to client)
  serverExternalPackages: ['postgres'],
};

export default nextConfig;
