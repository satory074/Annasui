"use client";

interface MedleyHeaderProps {
  title?: string;
  creator?: string;
  originalVideoUrl?: string;
}

export default function MedleyHeader({ title, creator, originalVideoUrl }: MedleyHeaderProps) {
  // タイトルも作成者もない場合は何も表示しない
  if (!title && !creator) {
    return null;
  }

  return (
    <div className="sticky top-16 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
        {/* メドレータイトルと制作者 */}
        <div className="mb-2 border-b border-gray-200 pb-2">
          {title && (
            originalVideoUrl ? (
              <a
                href={originalVideoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-lg font-bold text-gray-900 hover:text-orange-600 hover:underline cursor-pointer transition-colors"
                title="元動画を見る"
              >
                {title}
              </a>
            ) : (
              <h2 className="text-lg font-bold text-gray-900">
                {title}
              </h2>
            )
          )}
          {creator && (
            <p className="text-sm text-gray-600 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {creator}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}