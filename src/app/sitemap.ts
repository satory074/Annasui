import { MetadataRoute } from 'next'
import { getAllMedleys } from '@/lib/api/medleys'

const BASE_URL = 'https://anasui-e6f49.web.app'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticPages = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/profile/`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/settings/`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/privacy/`,
      lastModified: new Date(),
      changeFrequency: 'yearly' as const,
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/terms/`,
      lastModified: new Date(),
      changeFrequency: 'yearly' as const,
      priority: 0.3,
    },
  ]

  // Dynamic medley pages
  try {
    const medleys = await getAllMedleys()
    const medleyPages = medleys.map((medley) => {
      // Determine platform based on videoId format
      const videoId = medley.videoId
      const platform = videoId.startsWith('sm') || videoId.startsWith('nm') ? 'niconico' : 
                      videoId.length === 11 ? 'youtube' : 'niconico'
      
      return {
        url: `${BASE_URL}/${platform}/${videoId}/`,
        lastModified: medley.updatedAt ? new Date(medley.updatedAt) : new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }
    })

    return [...staticPages, ...medleyPages]
  } catch (error) {
    console.error('Error generating sitemap:', error)
    return staticPages
  }
}