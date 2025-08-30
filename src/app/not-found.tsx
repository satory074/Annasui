import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-lg w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <div className="mx-auto h-20 w-20 text-gray-400 mb-4">
            <svg fill="currentColor" viewBox="0 0 20 20" className="w-full h-full">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-orange-100 to-orange-200 text-orange-800 border border-orange-200">
            ALPHA VERSION
          </span>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          404 - ページが見つかりません
        </h1>
        
        <p className="text-gray-600 mb-6 leading-relaxed">
          お探しのページは存在しないか、移動された可能性があります。<br />
          アルファ版のため、一部のページが開発中の場合があります。
        </p>
        
        <div className="space-y-3 mb-6">
          <Link
            href="/"
            className="block bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-md"
          >
            🏠 ホームに戻る
          </Link>
          
          <a
            href="https://github.com/anthropics/claude-code/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-white border border-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors hover:bg-gray-50"
          >
            🐛 問題を報告する
          </a>
        </div>
        
        <p className="text-xs text-gray-500">
          メドレーIDで直接アクセスしている場合は、正しいURLか確認してください
        </p>
      </div>
    </div>
  );
}