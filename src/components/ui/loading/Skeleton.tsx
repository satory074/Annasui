import React from 'react'

interface SkeletonProps {
  className?: string
  width?: string
  height?: string
  rounded?: boolean
}

export function Skeleton({ 
  className = '', 
  width = 'w-full', 
  height = 'h-4',
  rounded = true
}: SkeletonProps) {
  const roundedClass = rounded ? 'rounded' : ''
  
  return (
    <div 
      className={`animate-pulse bg-gray-200 ${width} ${height} ${roundedClass} ${className}`}
    />
  )
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 animate-pulse">
      <div className="flex items-start space-x-4">
        {/* Thumbnail skeleton */}
        <div className="flex-shrink-0">
          <div className="w-20 h-16 bg-gray-200 rounded"></div>
        </div>
        
        {/* Content skeleton */}
        <div className="flex-1 space-y-2">
          <div className="h-5 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="flex items-center space-x-4 text-sm">
            <div className="h-3 bg-gray-200 rounded w-16"></div>
            <div className="h-3 bg-gray-200 rounded w-12"></div>
            <div className="h-3 bg-gray-200 rounded w-20"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function SkeletonMedleyList({ count = 8 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} />
      ))}
    </div>
  )
}

export function SkeletonButton({ width = 'w-24' }: { width?: string }) {
  return <div className={`h-10 bg-gray-200 rounded-lg animate-pulse ${width}`} />
}

export function SkeletonInput({ width = 'w-full' }: { width?: string }) {
  return <div className={`h-10 bg-gray-200 rounded-lg animate-pulse ${width}`} />
}

export function SkeletonText({ 
  lines = 3, 
  className = '' 
}: { 
  lines?: number
  className?: string 
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <div 
          key={index}
          className={`h-4 bg-gray-200 rounded animate-pulse ${
            index === lines - 1 ? 'w-3/4' : 'w-full'
          }`}
        />
      ))}
    </div>
  )
}