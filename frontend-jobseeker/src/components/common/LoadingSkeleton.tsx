interface LoadingSkeletonProps {
  rows?: number;
  columns?: number;
  variant?: 'table' | 'cards' | 'text';
  cardCount?: number;
}

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/80">
              {Array.from({ length: cols }).map((_, i) => (
                <th key={i} className="px-5 py-3.5">
                  <div className="h-3 w-20 bg-gray-200 rounded-lg animate-pulse" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, rowIdx) => (
              <tr key={rowIdx} className="border-b border-gray-50">
                {Array.from({ length: cols }).map((_, colIdx) => (
                  <td key={colIdx} className="px-5 py-4">
                    <div
                      className="h-4 bg-gray-100 rounded-lg animate-pulse"
                      style={{ width: `${Math.random() * 40 + 40}%` }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function CardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="w-11 h-11 bg-gray-100 rounded-xl animate-pulse" />
          </div>
          <div className="h-7 bg-gray-100 rounded-lg animate-pulse mb-2 w-3/4" />
          <div className="h-3.5 bg-gray-100 rounded animate-pulse w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function TextSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-gray-100 rounded animate-pulse"
          style={{ width: `${Math.random() * 30 + 70}%` }}
        />
      ))}
    </div>
  );
}

export default function LoadingSkeleton({ rows = 5, columns = 5 }: LoadingSkeletonProps) {
  return <TableSkeleton rows={rows} cols={columns} />;
}
