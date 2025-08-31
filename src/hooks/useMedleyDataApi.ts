import { useEffect, useState } from 'react'
import { SongSection, MedleyData } from '@/types'
import { getMedleyByVideoId } from '@/lib/api/medleys'

interface UseMedleyDataApiReturn {
  medleySongs: SongSection[]
  medleyTitle: string
  medleyCreator: string
  medleyDuration: number
  medleyData: MedleyData | null
  loading: boolean
  error: string | null
}

export function useMedleyDataApi(videoId: string): UseMedleyDataApiReturn {
  const [medleySongs, setMedleySongs] = useState<SongSection[]>([])
  const [medleyTitle, setMedleyTitle] = useState<string>('')
  const [medleyCreator, setMedleyCreator] = useState<string>('')
  const [medleyDuration, setMedleyDuration] = useState<number>(0)
  const [medleyData, setMedleyData] = useState<MedleyData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isCancelled = false

    async function fetchMedleyData() {
      if (!videoId) {
        setMedleySongs([])
        setMedleyTitle('')
        setMedleyCreator('')
        setMedleyDuration(0)
        setMedleyData(null)
        setLoading(false)
        setError(null)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const medleyData = await getMedleyByVideoId(videoId)
        
        if (isCancelled) return

        if (medleyData) {
          setMedleySongs(medleyData.songs)
          setMedleyDuration(medleyData.duration)
          setMedleyTitle(medleyData.title)
          setMedleyCreator(medleyData.creator || '')
          setMedleyData(medleyData)
        } else {
          // メドレーデータがない場合は空の配列にする
          setMedleySongs([])
          setMedleyTitle('')
          setMedleyCreator('')
          setMedleyDuration(0)
          setMedleyData(null)
          setError(`メドレーデータが見つかりませんでした: ${videoId}`)
        }
      } catch (err) {
        if (isCancelled) return
        
        console.error('Error fetching medley data:', err)
        setError('メドレーデータの取得中にエラーが発生しました')
        setMedleySongs([])
        setMedleyTitle('')
        setMedleyCreator('')
        setMedleyDuration(0)
        setMedleyData(null)
      } finally {
        if (!isCancelled) {
          setLoading(false)
        }
      }
    }

    fetchMedleyData()

    return () => {
      isCancelled = true
    }
  }, [videoId])

  return {
    medleySongs,
    medleyTitle,
    medleyCreator,
    medleyDuration,
    medleyData,
    loading,
    error,
  }
}