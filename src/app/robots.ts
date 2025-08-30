import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/auth/callback',
        '/_next/',
        '/settings',
        '/my-medleys',
        '/profile'
      ],
    },
    sitemap: 'https://anasui-e6f49.web.app/sitemap.xml',
  }
}