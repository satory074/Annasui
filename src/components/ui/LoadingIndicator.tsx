"use client";

interface LoadingIndicatorProps {
  message?: string;
}

export default function LoadingIndicator({ 
  message = "プレイヤーを読み込み中..." 
}: LoadingIndicatorProps) {
  return (
    <div className="aspect-video bg-gray-900 flex items-center justify-center relative">
      <div className="text-center text-white p-8">
        <div className="mb-6">
          {/* Spinning loader */}
          <div className="mx-auto h-16 w-16 mb-4">
            <svg 
              className="animate-spin h-16 w-16 text-pink-500" 
              fill="none" 
              viewBox="0 0 24 24"
            >
              <circle 
                className="opacity-25" 
                cx="12" 
                cy="12" 
                r="10" 
                stroke="currentColor" 
                strokeWidth="4"
              />
              <path 
                className="opacity-75" 
                fill="currentColor" 
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
          
          <h3 className="text-lg font-medium mb-2">
            {message}
          </h3>
          
          <p className="text-gray-300 text-sm">
            ニコニコ動画プレイヤーの準備をしています...
          </p>
        </div>

        <div className="flex justify-center space-x-1">
          <div className="h-2 w-2 bg-pink-500 rounded-full animate-bounce"></div>
          <div className="h-2 w-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="h-2 w-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    </div>
  );
}