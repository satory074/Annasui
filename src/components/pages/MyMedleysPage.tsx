'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { getUserMedleys, deleteMedley } from '@/lib/api/medleys'
import { MedleyData } from '@/types'
import AuthModal from '@/components/features/auth/AuthModal'
import CreateMedleyModal from '@/components/features/medley/CreateMedleyModal'

export default function MyMedleysPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [userMedleys, setUserMedleys] = useState<MedleyData[]>([])
  const [medleysLoading, setMedleysLoading] = useState(true)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'title' | 'created' | 'updated' | 'duration' | 'songs'>('created')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    if (loading) return

    if (!user) {
      setShowAuthModal(true)
      return
    }

    const loadUserMedleys = async () => {
      try {
        setMedleysLoading(true)
        const medleys = await getUserMedleys(user.id)
        setUserMedleys(medleys)
      } catch (error) {
        console.error('Failed to load user medleys:', error)
      } finally {
        setMedleysLoading(false)
      }
    }

    loadUserMedleys()
  }, [user, loading])

  const handleCreateMedley = async (medleyData: Omit<MedleyData, 'songs'>) => {
    // This would typically create a medley and refresh the list
    // For now, we'll close the modal and potentially navigate to the new medley
    setShowCreateModal(false)
  }

  const handleDeleteMedley = async (videoId: string) => {
    if (!deleteConfirmId) return
    
    setDeleteLoading(true)
    try {
      const success = await deleteMedley(videoId)
      if (success) {
        setUserMedleys(prev => prev.filter(m => m.videoId !== videoId))
        setDeleteConfirmId(null)
      } else {
        alert('メドレーの削除に失敗しました')
      }
    } catch (error) {
      console.error('Error deleting medley:', error)
      alert('メドレーの削除に失敗しました')
    } finally {
      setDeleteLoading(false)
    }
  }

  const filteredAndSortedMedleys = userMedleys
    .filter(medley => 
      medley.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (medley.creator || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let valueA, valueB
      
      switch (sortBy) {
        case 'title':
          valueA = a.title.toLowerCase()
          valueB = b.title.toLowerCase()
          break
        case 'created':
          valueA = new Date(a.createdAt || '1970-01-01').getTime()
          valueB = new Date(b.createdAt || '1970-01-01').getTime()
          break
        case 'updated':
          valueA = new Date(a.updatedAt || '1970-01-01').getTime()
          valueB = new Date(b.updatedAt || '1970-01-01').getTime()
          break
        case 'duration':
          valueA = a.duration
          valueB = b.duration
          break
        case 'songs':
          valueA = a.songs.length
          valueB = b.songs.length
          break
        default:
          return 0
      }
      
      if (valueA < valueB) return sortOrder === 'asc' ? -1 : 1
      if (valueA > valueB) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}分${remainingSeconds}秒`
  }

  const getMedleyUrl = (medley: MedleyData) => {
    const platform = medley.platform || 'niconico'
    return `/${platform}/${medley.videoId}`
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '不明'
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-caramel-600"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <>
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              ログインが必要です
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              マイメドレーページを表示するには、ログインしてください。
            </p>
            <button
              onClick={() => setShowAuthModal(true)}
              className="px-6 py-3 bg-caramel-600 hover:bg-caramel-700 text-white rounded-lg transition-colors"
            >
              ログイン
            </button>
          </div>
        </div>
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          title="Anasui にログイン"
          description="マイメドレーページにアクセスするには、ログインが必要です。"
        />
      </>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="flex items-center text-gray-600 dark:text-gray-400 hover:text-caramel-600 dark:hover:text-caramel-400 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                戻る
              </button>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                マイメドレー
              </h1>
            </div>
            
            <div className="flex items-center gap-3">
              <Link
                href="/profile"
                className="flex items-center px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                プロフィール
              </Link>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-caramel-600 hover:bg-caramel-700 text-white rounded-lg transition-colors font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                新規作成
              </button>
            </div>
          </div>

          <p className="text-gray-600 dark:text-gray-400">
            あなたが作成したメドレー一覧
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                検索
              </label>
              <input
                type="text"
                placeholder="メドレー名、作者名で検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-caramel-500 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                並び順
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-caramel-500 dark:text-white"
              >
                <option value="created">作成日</option>
                <option value="updated">更新日</option>
                <option value="title">タイトル</option>
                <option value="duration">再生時間</option>
                <option value="songs">楽曲数</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                順序
              </label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-caramel-500 dark:text-white"
              >
                <option value="desc">降順</option>
                <option value="asc">昇順</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-caramel-600 dark:text-caramel-400">
                {medleysLoading ? '-' : filteredAndSortedMedleys.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {searchTerm ? '検索結果' : 'メドレー数'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-olive-600">
                {medleysLoading ? '-' : userMedleys.reduce((total, medley) => total + medley.songs.length, 0)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                総楽曲数
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-sienna-600">
                {medleysLoading ? '-' : Math.floor(userMedleys.reduce((total, medley) => total + medley.duration, 0) / 60)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                総再生時間(分)
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {medleysLoading ? '-' : userMedleys.filter(m => m.platform === 'niconico').length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                ニコニコ動画
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        {medleysLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-caramel-600"></div>
          </div>
        ) : filteredAndSortedMedleys.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 dark:text-gray-400 mb-4">
              {searchTerm ? '検索条件に一致するメドレーが見つかりませんでした' : 'まだメドレーを作成していません'}
            </div>
            {!searchTerm && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-caramel-600 hover:bg-caramel-700 text-white rounded-lg transition-colors"
              >
                最初のメドレーを作成する
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAndSortedMedleys.map((medley) => (
              <div
                key={medley.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <Link
                      href={getMedleyUrl(medley)}
                      className="group block mb-2"
                    >
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-caramel-600 dark:group-hover:text-caramel-400 transition-colors line-clamp-2">
                        {medley.title}
                      </h3>
                    </Link>
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                        {formatDuration(medley.duration)}
                      </div>
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.369 4.369 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                        </svg>
                        {medley.songs.length}曲
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={`px-2 py-1 text-xs rounded ${
                          medley.platform === 'youtube' 
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' 
                            : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                        }`}>
                          {medley.platform === 'youtube' ? 'YouTube' : 'ニコニコ'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      作成: {formatDate(medley.createdAt)} • 更新: {formatDate(medley.updatedAt)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Link
                      href={getMedleyUrl(medley)}
                      className="flex items-center px-3 py-2 text-sm bg-caramel-100 dark:bg-caramel-900 text-caramel-700 dark:text-caramel-300 rounded-lg hover:bg-caramel-200 dark:hover:bg-caramel-800 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      編集
                    </Link>
                    <button
                      onClick={() => setDeleteConfirmId(medley.id || null)}
                      className="flex items-center px-3 py-2 text-sm bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      削除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              メドレーを削除しますか？
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              この操作は取り消せません。本当に削除しますか？
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                disabled={deleteLoading}
              >
                キャンセル
              </button>
              <button
                onClick={() => {
                  const medley = userMedleys.find(m => m.id === deleteConfirmId)
                  if (medley) {
                    handleDeleteMedley(medley.videoId)
                  }
                }}
                disabled={deleteLoading}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {deleteLoading ? '削除中...' : '削除'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Medley Modal */}
      <CreateMedleyModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreateMedley={handleCreateMedley}
      />
    </div>
  )
}