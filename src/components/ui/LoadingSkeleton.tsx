/**
 * Loading skeleton components for better UX during content loading
 */

interface SkeletonProps {
  className?: string;
}

export function SkeletonLine({ className = '' }: SkeletonProps) {
  return (
    <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-4 ${className}`}></div>
  );
}

export function SkeletonThumbnail({ className = '' }: SkeletonProps) {
  return (
    <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded aspect-video ${className}`}></div>
  );
}

export function SkeletonCard({ className = '' }: SkeletonProps) {
  return (
    <div className={`animate-pulse p-4 border border-gray-200 dark:border-gray-700 rounded-lg ${className}`}>
      <SkeletonThumbnail className="mb-4" />
      <SkeletonLine className="mb-2" />
      <SkeletonLine className="w-3/4 mb-2" />
      <SkeletonLine className="w-1/2" />
    </div>
  );
}

export function SkeletonSongItem({ className = '' }: SkeletonProps) {
  return (
    <div className={`animate-pulse flex items-center space-x-3 p-3 ${className}`}>
      <div className="bg-gray-200 dark:bg-gray-700 rounded w-12 h-12 flex-shrink-0"></div>
      <div className="flex-1 space-y-2">
        <SkeletonLine className="h-3" />
        <SkeletonLine className="h-3 w-2/3" />
      </div>
      <div className="bg-gray-200 dark:bg-gray-700 rounded w-16 h-6"></div>
    </div>
  );
}