"use client";

interface SafeModePlayerProps {
  videoId: string;
  onRetry: () => void;
}

export default function SafeModePlayer({ videoId, onRetry }: SafeModePlayerProps) {
  const nicoVideoUrl = `https://www.nicovideo.jp/watch/${videoId}`;

  return (
    <div className="aspect-video bg-gray-900 flex items-center justify-center relative">
      <div className="text-center text-white p-8 max-w-md">
        <div className="mb-6">
          <svg 
            className="mx-auto h-16 w-16 text-yellow-400 mb-4" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.732 18.5c-.77.833.192 2.5 1.732 2.5z" 
            />
          </svg>
          
          <h3 className="text-xl font-semibold mb-2">
            セーフモード
          </h3>
          
          <p className="text-gray-300 text-sm mb-6">
            埋め込みプレイヤーの初期化に時間がかかっています。<br/>
            下記のオプションをお試しください。
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={onRetry}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-6 rounded transition-colors"
          >
            🔄 プレイヤーを再読み込み
          </button>
          
          <a
            href={nicoVideoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded transition-colors"
          >
            🎥 ニコニコ動画で視聴
          </a>
          
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded transition-colors text-sm"
          >
            ページ全体を再読み込み
          </button>
        </div>

        <div className="mt-6 text-xs text-gray-400 space-y-1">
          <p><strong>動画ID:</strong> {videoId}</p>
          <p>この動画は埋め込み再生が制限されている可能性があります</p>
          <p>または、ブラウザの設定でJavaScriptがブロックされている可能性があります</p>
        </div>
      </div>
    </div>
  );
}