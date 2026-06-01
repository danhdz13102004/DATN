

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export default function EmptyState({
  icon = 'fa-inbox',
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-4 text-center ${className}`}>
      {/* Icon with gradient background */}
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center mb-5 shadow-sm border border-gray-100">
        <i className={`fas ${icon} text-3xl text-gray-300`} />
      </div>

      {/* Text */}
      <h3 className="text-base font-semibold text-gray-700 mb-1.5">{title}</h3>
      {description && (
        <p className="text-sm text-gray-400 max-w-xs leading-relaxed">{description}</p>
      )}

      {/* Action */}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="empty-state-cta mt-5 px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-hover transition-all duration-200 shadow-sm hover:shadow-md flex items-center gap-2"
        >
          {actionLabel}
          <i className="empty-state-arrow fas fa-arrow-right text-xs transition-transform" />
        </button>
      )}
    </div>
  );
}
