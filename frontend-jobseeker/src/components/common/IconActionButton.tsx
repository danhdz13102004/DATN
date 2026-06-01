import React from 'react';

interface IconActionButtonProps {
  icon: string;
  title: string;
  onClick?: () => void;
  href?: string;
  variant?: 'default' | 'danger' | 'success' | 'warning';
  size?: 'sm' | 'md';
  className?: string;
  disabled?: boolean;
}

export default function IconActionButton({
  icon,
  title,
  onClick,
  href,
  variant = 'default',
  size = 'md',
  className = '',
  disabled = false,
}: IconActionButtonProps) {
  const sizeClass = size === 'sm' ? 'w-8 h-8' : 'w-9 h-9';
  const iconSize = size === 'sm' ? 'text-xs' : 'text-sm';

  const baseClass = `inline-flex items-center justify-center rounded-xl transition-all duration-150 shadow-sm ${sizeClass} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`;

  const variantStyles: Record<string, React.CSSProperties> = {
    default: {
      background: '#F9FAFB',
      color: '#9CA3AF',
      border: '1px solid transparent',
    },
    danger: {
      background: '#FEF2F2',
      color: '#FCA5A5',
      border: '1px solid transparent',
    },
    success: {
      background: '#F0FDF4',
      color: '#86EFAC',
      border: '1px solid transparent',
    },
    warning: {
      background: '#FFFBEB',
      color: '#FCD34D',
      border: '1px solid transparent',
    },
  };

  const hoverStyles: Record<string, React.CSSProperties> = {
    default: { background: '#EFF6FF', color: '#2563EB', borderColor: 'transparent' },
    danger: { background: '#FEE2E2', color: '#EF4444', borderColor: 'transparent' },
    success: { background: '#D1FAE5', color: '#10B981', borderColor: 'transparent' },
    warning: { background: '#FEF3C7', color: '#F59E0B', borderColor: 'transparent' },
  };

  const [hovered, setHovered] = React.useState(false);
  const [pressed, setPressed] = React.useState(false);

  const style: React.CSSProperties = {
    ...variantStyles[variant],
    ...(hovered && !disabled ? hoverStyles[variant] : {}),
    ...(pressed ? { transform: 'scale(0.94)' } : {}),
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: iconSize,
  };

  const content = <i className={`fas ${icon} ${iconSize}`} />;

  if (href) {
    return (
      <a
        href={href}
        title={title}
        className={baseClass}
        style={style}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); setPressed(false); }}
        onMouseDown={() => setPressed(true)}
        onMouseUp={() => setPressed(false)}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      onClick={disabled ? undefined : onClick}
      title={title}
      className={baseClass}
      style={style}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
    >
      {content}
    </button>
  );
}
