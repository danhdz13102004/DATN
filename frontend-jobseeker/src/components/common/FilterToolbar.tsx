interface FilterToolbarProps {
  children: React.ReactNode;
  className?: string;
  resultsSummary?: string;
  activeFilters?: number;
}

export default function FilterToolbar({
  children,
  className = '',
  resultsSummary,
  activeFilters,
}: FilterToolbarProps) {
  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-4 ${className}`}
    >
      <div className="flex flex-wrap items-center gap-3">{children}</div>

      {resultsSummary && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-400">{resultsSummary}</p>
          {activeFilters != null && activeFilters > 0 && (
            <p className="text-xs text-primary font-medium">
              <i className="fas fa-filter-alt mr-1" />
              {activeFilters} filter{activeFilters !== 1 ? 's' : ''} active
            </p>
          )}
        </div>
      )}
    </div>
  );
}
