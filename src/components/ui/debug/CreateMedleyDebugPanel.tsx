'use client';

import React from 'react';
import { VideoMetadata } from '@/lib/utils/videoMetadata';

interface CreateMedleyDebugPanelProps {
  isVisible: boolean;
  currentUrl: string;
  detectedPlatform: string;
  extractedVideoId: string | null;
  isLoading: boolean;
  loadingMessage: string;
  lastMetadataResponse?: VideoMetadata;
  lastError?: string;
  networkTest?: {
    timestamp: string;
    passed: boolean;
    details: string;
  };
}

export const CreateMedleyDebugPanel: React.FC<CreateMedleyDebugPanelProps> = ({
  isVisible,
  currentUrl,
  detectedPlatform,
  extractedVideoId,
  isLoading,
  loadingMessage,
  lastMetadataResponse,
  lastError,
  networkTest
}) => {
  // プロダクション環境でのデバッグを有効にするかのチェック
  const showDebug = typeof window !== 'undefined' && 
    (window.location.search.includes('debug=true') || 
     window.location.search.includes('debug=create') ||
     window.location.hostname === 'localhost');

  if (!showDebug || !isVisible) {
    return null;
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('ja-JP');
  };

  const formatDebugInfo = (debugInfo: Record<string, unknown>) => {
    if (!debugInfo) return 'デバッグ情報なし';
    
    const apiUrl = typeof debugInfo.apiUrl === 'string' ? debugInfo.apiUrl : '';
    const responseStatus = typeof debugInfo.responseStatus === 'number' ? debugInfo.responseStatus : undefined;
    const corsError = Boolean(debugInfo.corsError);
    const responseText = typeof debugInfo.responseText === 'string' ? debugInfo.responseText : '';
    const hasErrorDetails = Boolean(debugInfo.errorDetails);
    
    return (
      <div className="space-y-1 text-xs">
        {apiUrl && (
          <div>API URL: <span className="text-blue-300">{apiUrl}</span></div>
        )}
        {responseStatus !== undefined && (
          <div>HTTP Status: <span className={responseStatus >= 400 ? 'text-red-300' : 'text-green-300'}>
            {responseStatus}
          </span></div>
        )}
        {corsError && (
          <div className="text-red-300">🚫 CORS Error Detected</div>
        )}
        {hasErrorDetails && (
          <div className="mt-1">
            <div className="text-yellow-300">Error Details:</div>
            <pre className="text-xs text-gray-300 whitespace-pre-wrap max-h-20 overflow-y-auto">
              {typeof debugInfo.errorDetails === 'object' 
                ? JSON.stringify(debugInfo.errorDetails, null, 2)
                : String(debugInfo.errorDetails)}
            </pre>
          </div>
        )}
        {responseText && responseText !== 'テキスト取得失敗' && (
          <div className="mt-1">
            <div className="text-yellow-300">Response Text:</div>
            <pre className="text-xs text-gray-300 whitespace-pre-wrap max-h-32 overflow-y-auto">
              {responseText.substring(0, 500)}
              {responseText.length > 500 && '...'}
            </pre>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed top-20 right-4 z-[70] bg-black bg-opacity-95 text-white p-4 rounded-lg text-xs font-mono max-w-md max-h-[80vh] overflow-y-auto">
      <h3 className="text-yellow-400 font-bold mb-3 flex items-center">
        🛠️ メドレー作成デバッグ
        <button 
          onClick={() => window.location.search = window.location.search.replace(/[?&]debug=[^&]*/g, '')}
          className="ml-2 text-red-400 hover:text-red-300 text-sm"
          title="デバッグモードを終了"
        >
          ✕
        </button>
      </h3>
      
      <div className="space-y-3">
        {/* URL解析情報 */}
        <div className="border-b border-gray-600 pb-2">
          <div className="text-yellow-400 font-semibold mb-1">URL解析結果</div>
          <div>入力URL: <span className="text-blue-300 break-all">{currentUrl || '未入力'}</span></div>
          <div>検出プラットフォーム: <span className={detectedPlatform ? 'text-green-300' : 'text-red-300'}>
            {detectedPlatform || '未検出'}
          </span></div>
          <div>動画ID: <span className={extractedVideoId ? 'text-green-300' : 'text-red-300'}>
            {extractedVideoId || '未抽出'}
          </span></div>
        </div>

        {/* 取得状態 */}
        <div className="border-b border-gray-600 pb-2">
          <div className="text-yellow-400 font-semibold mb-1">取得状態</div>
          <div>状態: <span className={isLoading ? 'text-yellow-300' : 'text-gray-300'}>
            {isLoading ? '🔄 取得中' : '⏸️ 待機中'}
          </span></div>
          {loadingMessage && (
            <div>メッセージ: <span className="text-blue-300">{loadingMessage}</span></div>
          )}
        </div>

        {/* ネットワークテスト */}
        {networkTest && (
          <div className="border-b border-gray-600 pb-2">
            <div className="text-yellow-400 font-semibold mb-1">ネットワークテスト</div>
            <div>時刻: <span className="text-gray-300">{formatTimestamp(networkTest.timestamp)}</span></div>
            <div>結果: <span className={networkTest.passed ? 'text-green-300' : 'text-red-300'}>
              {networkTest.passed ? '✅ 成功' : '❌ 失敗'}
            </span></div>
            <div className="text-xs text-gray-400 mt-1">{networkTest.details}</div>
          </div>
        )}

        {/* 最後のAPI応答 */}
        {lastMetadataResponse && (
          <div className="border-b border-gray-600 pb-2">
            <div className="text-yellow-400 font-semibold mb-1">最新の取得結果</div>
            <div>成功: <span className={lastMetadataResponse.success ? 'text-green-300' : 'text-red-300'}>
              {lastMetadataResponse.success ? '✅ Yes' : '❌ No'}
            </span></div>
            {lastMetadataResponse.success ? (
              <div className="space-y-1">
                <div>タイトル: <span className="text-green-300">{lastMetadataResponse.title || '未設定'}</span></div>
                <div>作成者: <span className="text-green-300">{lastMetadataResponse.creator || '未設定'}</span></div>
                <div>動画長: <span className="text-green-300">{lastMetadataResponse.duration ? `${lastMetadataResponse.duration}秒` : '未設定'}</span></div>
                <div>サムネイル: <span className="text-green-300">{lastMetadataResponse.thumbnail ? '取得済み' : '未取得'}</span></div>
              </div>
            ) : (
              <div>
                <div className="text-red-300">エラー: {lastMetadataResponse.error}</div>
                {lastMetadataResponse.debugInfo && (
                  <div className="mt-2">
                    {formatDebugInfo(lastMetadataResponse.debugInfo)}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* エラー詳細 */}
        {lastError && (
          <div className="border-b border-gray-600 pb-2">
            <div className="text-red-400 font-semibold mb-1">⚠️ 最新エラー</div>
            <div className="text-red-300 text-xs break-all">{lastError}</div>
          </div>
        )}

        {/* 操作ガイド */}
        <div>
          <div className="text-yellow-400 font-semibold mb-1">🔧 トラブルシューティング</div>
          <div className="space-y-1 text-xs text-gray-400">
            <div>• CORS エラー: プロキシサーバー実装が必要</div>
            <div>• HTTP 404: 動画が存在しないか、プライベート設定</div>
            <div>• XML 解析エラー: API 仕様変更の可能性</div>
            <div>• Network Error: インターネット接続を確認</div>
          </div>
        </div>

        <div className="text-xs text-gray-500 border-t border-gray-700 pt-2">
          ?debug=true または ?debug=create でデバッグ表示
        </div>
      </div>
    </div>
  );
};