
import type { ReactNode } from 'react';

interface ActionButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  icon?: string;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  fullWidth?: boolean;
}

export default function ActionButton({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  onClick,
  type = 'button',
  className = '',
  fullWidth = false,
}: ActionButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2';

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const variantClasses = {
    primary: `
      bg-primary text-white
      hover:bg-primary-hover
      shadow-sm shadow-primary/20
      hover:shadow-md hover:shadow-primary/30
      focus:ring-primary/50
      disabled:bg-primary/50 disabled:shadow-none
    `,
    secondary: `
      bg-white text-gray-700 border border-gray-200
      hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm
      focus:ring-gray-200
      disabled:bg-gray-50 disabled:text-gray-400
    `,
    outline: `
      bg-transparent text-gray-600 border border-gray-200
      hover:bg-gray-50 hover:text-gray-900 hover:border-gray-300
      focus:ring-gray-200
      disabled:bg-gray-50 disabled:text-gray-300 disabled:border-gray-100
    `,
    danger: `
      bg-danger text-white
      hover:bg-danger/90
      shadow-sm shadow-danger/20
      focus:ring-danger/50
      disabled:bg-danger/50 disabled:shadow-none
    `,
    ghost: `
      bg-transparent text-gray-500
      hover:bg-gray-100 hover:text-gray-700
      focus:ring-gray-200
      disabled:text-gray-300
    `,
  };

  const iconSizes = {
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-sm',
  };

  const spinnerSize = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  const iconElement = icon && (
    <i className={`fas ${icon} ${iconSizes[size]}`} />
  );

  const spinnerElement = (
    <span className={`${spinnerSize[size]} border-2 border-white/30 border-t-white rounded-full animate-spin`} />
  );

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        ${baseClasses}
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
    >
      {loading ? (
        spinnerElement
      ) : (
        <>
          {iconPosition === 'left' && iconElement}
          {children}
          {iconPosition === 'right' && iconElement}
        </>
      )}
    </button>
  );
}
