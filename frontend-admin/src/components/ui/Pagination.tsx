interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2
  );

  return (
    <div className="flex items-center justify-center gap-1 py-4">
      <button
        className="w-8 h-8 flex items-center justify-center rounded-lg text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
      >
        <i className="fas fa-chevron-left text-xs" />
      </button>

      {pages.map((p, idx) => {
        const prev = pages[idx - 1];
        return (
          <span key={p} className="flex items-center gap-1">
            {prev && p - prev > 1 && (
              <span className="w-8 h-8 flex items-center justify-center text-gray-400 text-sm">…</span>
            )}
            <button
              className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                p === page
                  ? 'bg-primary text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              onClick={() => onPageChange(p)}
            >
              {p}
            </button>
          </span>
        );
      })}

      <button
        className="w-8 h-8 flex items-center justify-center rounded-lg text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
      >
        <i className="fas fa-chevron-right text-xs" />
      </button>
    </div>
  );
}
