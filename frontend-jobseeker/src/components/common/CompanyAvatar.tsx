interface CompanyAvatarProps {
  initial: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'soft' | 'gradient';
  className?: string;
}

const SIZES = {
  sm: { container: 'w-8 h-8 text-xs', icon: 'text-[0.7rem]' },
  md: { container: 'w-10 h-10 text-sm', icon: 'text-sm' },
  lg: { container: 'w-12 h-12 text-base', icon: 'text-base' },
};

const GRADIENTS = [
  { from: '#DBEAFE', to: '#BFDBFE', text: '#1E40AF' },
  { from: '#EDE9FE', to: '#DDD6FE', text: '#5B21B6' },
  { from: '#D1FAE5', to: '#A7F3D0', text: '#065F46' },
  { from: '#FEF3C7', to: '#FDE68A', text: '#92400E' },
  { from: '#FCE7F3', to: '#FBCFE8', text: '#9D174D' },
  { from: '#E0F2FE', to: '#BAE6FD', text: '#075985' },
];

function getGradient(initial: string) {
  const idx = initial.charCodeAt(0) % GRADIENTS.length;
  return GRADIENTS[idx];
}

export default function CompanyAvatar({
  initial,
  size = 'md',
  variant = 'soft',
  className = '',
}: CompanyAvatarProps) {
  const dim = SIZES[size];
  const grad = getGradient(initial);

  if (variant === 'gradient') {
    return (
      <div
        className={`${dim.container} rounded-xl flex items-center justify-center font-bold flex-shrink-0 shadow-sm ${className}`}
        style={{
          background: `linear-gradient(135deg, ${grad.from}, ${grad.to})`,
          color: grad.text,
        }}
      >
        {initial}
      </div>
    );
  }

  return (
    <div
      className={`${dim.container} rounded-xl flex items-center justify-center flex-shrink-0 ${className}`}
      style={{
        background: grad.from,
        color: grad.text,
      }}
    >
      <span className={`font-bold ${dim.icon}`}>{initial}</span>
    </div>
  );
}
