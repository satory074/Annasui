import { useEffect, useState, useCallback } from 'react'
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
  isRefetching: boolean
  error: string | null
  refetch: () => void
}

export function useMedleyDataApi(videoId: string): UseMedleyDataApiReturn {
  const [medleySongs, setMedleySongs] = useState<SongSection[]>([])
  const [medleyTitle, setMedleyTitle] = useState<string>('')
  const [medleyCreator, setMedleyCreator] = useState<string>('')
  const [medleyDuration, setMedleyDuration] = useState<number>(0)
  const [medleyData, setMedleyData] = useState<MedleyData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [isRefetching, setIsRefetching] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [isInitialLoad, setIsInitialLoad] = useState<boolean>(true)

  const fetchMedleyData = useCallback(async () => {
    let timeoutId: NodeJS.Timeout | undefined

    if (!videoId) {
        setMedleySongs([])
        setMedleyTitle('')
        setMedleyCreator('')
        setMedleyDuration(0)
        setMedleyData(null)
        setLoading(false)
        setIsRefetching(false)
        setError(null)
        return
      }

      // 初回ロード時のみloadingをtrue、refetch時はisRefetchingをtrue
      if (isInitialLoad) {
        setLoading(true)
        logger.info('📥 Initial medley data load for:', videoId)
      } else {
        setIsRefetching(true)
        logger.info('🔄 Refetching medley data for:', videoId)
      }
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

        // 初回ロード完了後はisInitialLoadをfalseにする
        if (isInitialLoad) {
          setIsInitialLoad(false)
        }

        setLoading(false)
        setIsRefetching(false)
      }
    }, [videoId, isInitialLoad])

    useEffect(() => {
      fetchMedleyData()
    }, [fetchMedleyData])

  return {
    medleySongs,
    medleyTitle,
    medleyCreator,
    medleyDuration,
    medleyData,
    loading,
    isRefetching,
    error,
    refetch: fetchMedleyData,
  }
}