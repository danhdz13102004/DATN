interface DataTableProps {
  columns: { key: string; label: string; className?: string }[];
  children: React.ReactNode;
  className?: string;
  emptyState?: React.ReactNode;
  isEmpty?: boolean;
  isLoading?: boolean;
  loadingRowCount?: number;
  hoverable?: boolean;
}

function SkeletonRow({ columns }: { columns: number }) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-5 py-4">
          <div className="h-4 bg-gray-100 rounded-lg animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

export default function DataTable({
  columns,
  children,
  className = '',
  emptyState,
  isEmpty = false,
  isLoading = false,
  loadingRowCount = 5,
  hoverable = true,
}: DataTableProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className={`w-full ${className}`}>
          <thead>
            <tr className="bg-gray-50/80">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-100 ${col.className ?? ''}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={hoverable ? '[&_tr:last-child>td]:border-b-0' : ''}>
            {isLoading ? (
              Array.from({ length: loadingRowCount }).map((_, i) => (
                <tr key={i} className="border-b border-gray-50">
                  <SkeletonRow columns={columns.length} />
                </tr>
              ))
            ) : isEmpty && emptyState ? (
              <tr>
                <td colSpan={columns.length} className="p-0">
                  {emptyState}
                </td>
              </tr>
            ) : (
              children
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
