import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center">
        <div className="mb-4">
          <div className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500">
            <svg
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              className="w-full h-full"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.467.881-6.071 2.33m2.007-3.17a3.99 3.99 0 012.128-.6c1.71 0 3.221.765 4.236 2.003m1.636-2.4A5.978 5.978 0 0012 13c-1.66 0-3.166.69-4.239 1.8m7.478.8L15 16l-.24-.8"
              />
            </svg>
          </div>
        </div>
        
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          404 - ページが見つかりません
        </h2>
        
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          お探しのページは存在しないか、移動された可能性があります。
        </p>
        
        <Link
          href="/"
          className="inline-block bg-pink-600 hover:bg-pink-700 text-white font-medium py-2 px-4 rounded transition-colors"
        >
          ホームに戻る
        </Link>
      </div>
    </div>
  );
}