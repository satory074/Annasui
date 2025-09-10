import { useEffect, useState } from 'react'
import { SongSection, MedleyData } from '@/types'
import { getMedleyByVideoId } from '@/lib/api/medleys'
import { logger } from '@/lib/utils/logger'

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
    let timeoutId: NodeJS.Timeout

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

      // プロダクション環境での無限ローディング防止のためタイムアウトを設定
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          logger.warn('⚠️ Medley data request timed out after 30 seconds')
          reject(new Error('リクエストがタイムアウトしました。ネットワーク接続を確認してください。'))
        }, 30000) // 30秒でタイムアウト（延長）
      })

      try {
        const medleyData = await Promise.race([
          getMedleyByVideoId(videoId),
          timeoutPromise
        ])
        
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
        
        logger.error('❌ Error fetching medley data:', err)
        logger.info('🔍 Error details for debugging:', {
          errorType: err?.constructor?.name,
          errorMessage: (err as Error)?.message || String(err),
          videoId,
          timestamp: new Date().toISOString()
        })
        
        // より詳細なエラーメッセージを提供
        let errorMessage = 'メドレーデータの取得中にエラーが発生しました'
        if (err instanceof Error) {
          if (err.message.includes('タイムアウト')) {
            errorMessage = 'データの読み込みに時間がかかっています。ページを再読み込みしてください。'
          } else if (err.message.includes('Failed to fetch')) {
            errorMessage = 'ネットワークエラーが発生しました。インターネット接続を確認してください。'
          } else {
            errorMessage = `エラー: ${err.message}`
          }
        }
        
        setError(errorMessage)
        setMedleySongs([])
        setMedleyTitle('')
        setMedleyCreator('')
        setMedleyDuration(0)
        setMedleyData(null)
      } finally {
        // タイムアウトをクリア
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
        
        if (!isCancelled) {
          setLoading(false)
        }
      }
    }

    fetchMedleyData()

    return () => {
      isCancelled = true
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
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