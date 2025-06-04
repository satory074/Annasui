export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center">
        <div className="mb-4">
          <div className="mx-auto h-16 w-16 border-4 border-pink-200 border-t-pink-600 rounded-full animate-spin"></div>
        </div>
        
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          読み込み中...
        </h2>
        
        <p className="text-gray-600 dark:text-gray-300">
          ニコニコ楽曲アノテーションプレイヤーを準備しています
        </p>
      </div>
    </div>
  );
}