
import type { ReactNode } from 'react';

interface InfoGridProps {
  items: {
    label: string;
    value: string | ReactNode;
    icon?: string;
    highlight?: boolean;
  }[];
  columns?: 2 | 3 | 4;
  className?: string;
}

export default function InfoGrid({
  items,
  columns = 4,
  className = '',
}: InfoGridProps) {
  const gridClass = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-4',
  }[columns];

  return (
    <div className={`grid ${gridClass} gap-3 ${className}`}>
      {items.map((item) => (
        <div
          key={item.label}
          className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100/70 transition-colors"
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            {item.icon && (
              <i className={`fas ${item.icon} text-xs text-gray-400`} />
            )}
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              {item.label}
            </span>
          </div>
          <div className={`text-sm font-semibold ${item.highlight ? 'text-primary' : 'text-gray-900'} leading-snug`}>
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}
