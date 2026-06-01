
import React from 'react';

interface LoadingSkeletonProps {
  variant?: 'text' | 'card' | 'table-row' | 'avatar';
  width?: string;
  height?: string;
  className?: string;
  count?: number;
}

export default function LoadingSkeleton({
  variant = 'text',
  width,
  height,
  className = '',
  count = 1,
}: LoadingSkeletonProps) {
  const baseClasses = 'skeleton rounded';

  const variants = {
    text: {
      default: 'h-4 w-full',
      width: width || 'w-full',
      height: height || 'h-4',
    },
    card: {
      default: 'h-32 w-full',
      width: width || 'w-full',
      height: height || 'h-32',
    },
    'table-row': {
      default: 'h-14 w-full',
      width: width || 'w-full',
      height: height || 'h-14',
    },
    avatar: {
      default: 'h-10 w-10 rounded-full',
      width: width || 'h-10 w-10 rounded-full',
      height: height || 'h-10 w-10 rounded-full',
    },
  };

  const { default: defaultStyle, width: w, height: h } = variants[variant];

  const style: React.CSSProperties = {
    width: width || w,
    height: height || h,
  };

  if (count === 1) {
    return <div className={`${baseClasses} ${defaultStyle} ${className}`} style={style} />;
  }

  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`${baseClasses} ${defaultStyle} ${className}`} style={style} />
      ))}
    </div>
  );
}

// Table skeleton component
export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-5 border-b border-gray-50">
        <div className="skeleton h-5 w-32 rounded" />
      </div>
      <div className="p-4 space-y-3">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex gap-4 items-center">
            {Array.from({ length: cols }).map((_, colIndex) => (
              <div
                key={colIndex}
                className={`skeleton rounded ${colIndex === 0 ? 'h-4 w-28' : 'flex-1 h-4'}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// Card skeleton component
export function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-start gap-4">
        <div className="skeleton w-11 h-11 rounded-xl" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-24 rounded" />
          <div className="skeleton h-6 w-16 rounded" />
        </div>
      </div>
    </div>
  );
}

// StatCard skeleton component
export function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-start gap-4">
        <div className="skeleton w-11 h-11 rounded-xl" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-3 w-20 rounded" />
          <div className="skeleton h-8 w-12 rounded" />
        </div>
      </div>
    </div>
  );
}

// JobCard skeleton component
export function JobCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      {/* Header */}
      <div className="flex items-start gap-4 mb-5">
        <div className="skeleton w-14 h-14 rounded-2xl shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-3/4 rounded" />
          <div className="skeleton h-3 w-1/2 rounded" />
        </div>
        <div className="skeleton w-9 h-9 rounded-xl shrink-0" />
      </div>
      {/* Badges */}
      <div className="flex gap-2 mb-4">
        <div className="skeleton h-7 w-24 rounded-lg" />
        <div className="skeleton h-7 w-20 rounded-lg" />
        <div className="skeleton h-7 w-20 rounded-lg" />
      </div>
      {/* Skills */}
      <div className="flex gap-2 mb-5">
        <div className="skeleton h-6 w-16 rounded-full" />
        <div className="skeleton h-6 w-20 rounded-full" />
        <div className="skeleton h-6 w-16 rounded-full" />
      </div>
      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-50">
        <div className="skeleton h-4 w-24 rounded" />
        <div className="skeleton h-9 w-28 rounded-xl" />
      </div>
    </div>
  );
}

// Application skeleton component
export function ApplicationSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-center gap-4">
        <div className="skeleton w-12 h-12 rounded-xl shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="skeleton h-4 w-40 rounded" />
          <div className="skeleton h-3 w-56 rounded" />
        </div>
        <div className="skeleton h-6 w-20 rounded-full shrink-0" />
        <div className="skeleton w-9 h-9 rounded-xl shrink-0" />
      </div>
      <div className="h-0.5 bg-gray-50 rounded-b-2xl mt-4 overflow-hidden">
        <div className="skeleton h-full w-2/5 rounded-full" />
      </div>
    </div>
  );
}
