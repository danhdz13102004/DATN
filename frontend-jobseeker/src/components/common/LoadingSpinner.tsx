interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

export default function LoadingSpinner({ size = 'md', className = '', label }: LoadingSpinnerProps) {
  const sizes = {
    sm: 'w-5 h-5 border-[2px]',
    md: 'w-8 h-8 border-[3px]',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
      <div className={`${sizes[size]} border-blue-100 border-t-primary rounded-full animate-spin`} />
      {label && (
        <p className="mt-3 text-sm text-gray-400 font-medium">{label}</p>
      )}
    </div>
  );
}
