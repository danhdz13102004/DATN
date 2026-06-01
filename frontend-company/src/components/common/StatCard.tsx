

interface StatCardProps {
  label: string;
  value: number | string;
  icon: string;
  iconBg?: string;
  iconColor?: string;
  bgGradient?: string;
  borderColor?: string;
  trend?: string;
  isUp?: boolean;
  className?: string;
}

export default function StatCard({
  label,
  value,
  icon,
  iconBg = 'bg-emerald-100',
  iconColor = 'text-emerald-600',
  bgGradient = 'from-emerald-50 to-teal-50',
  borderColor = 'border-emerald-100/60',
  trend,
  isUp = true,
  className = '',
}: StatCardProps) {
  return (
    <div
      className={`
        relative overflow-hidden
        bg-gradient-to-br ${bgGradient}
        rounded-2xl p-5 border ${borderColor}
        shadow-card hover:shadow-card-hover
        transition-all duration-200 cursor-default
        group hover:-translate-y-0.5
        ${className}
      `}
    >
      {/* Background blur decoration */}
      <div className={`absolute -bottom-3 -right-3 w-20 h-20 rounded-full bg-gradient-to-br ${bgGradient} opacity-40 blur-xl`} />
      
      {/* Icon */}
      <div className="relative">
        <div className={`w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center ${iconColor} shadow-sm group-hover:scale-110 transition-transform duration-200`}>
          <i className={`fas ${icon}`} />
        </div>
      </div>

      {/* Content */}
      <div className="mt-4 relative">
        <div className="text-3xl font-black text-gray-900 tracking-tight">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        <div className="text-sm font-medium text-gray-500 mt-1 leading-snug">
          {label}
        </div>
        {trend && (
          <div className={`text-xs mt-2 flex items-center gap-1 font-medium ${isUp ? 'text-emerald-600' : 'text-amber-600'}`}>
            <i className={`fas fa-arrow-${isUp ? 'up' : 'down'} text-[10px]`} />
            {trend}
          </div>
        )}
      </div>
    </div>
  );
}
