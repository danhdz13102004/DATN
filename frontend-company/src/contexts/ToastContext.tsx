import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface ToastOptions {
  message: string;
  type?: ToastType;
  duration?: number;
}

interface ToastContextValue {
  toast: {
    success: (message: string, duration?: number) => void;
    error: (message: string, duration?: number) => void;
    info: (message: string, duration?: number) => void;
    show: (options: ToastOptions) => void;
  };
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context.toast;
};

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'info', duration: number = 3000) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const toast = {
    success: (message: string, duration?: number) => addToast(message, 'success', duration),
    error: (message: string, duration?: number) => addToast(message, 'error', duration),
    info: (message: string, duration?: number) => addToast(message, 'info', duration),
    show: ({ message, type = 'info', duration }: ToastOptions) => addToast(message, type, duration),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-3 min-w-[300px] px-4 py-3 rounded-xl shadow-lg animate-fade-in-up text-sm font-medium border ${
              t.type === 'success' ? 'bg-white border-emerald-100 text-emerald-700' :
              t.type === 'error' ? 'bg-white border-red-100 text-red-600' :
              'bg-white border-gray-100 text-gray-700'
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              t.type === 'success' ? 'bg-emerald-50 text-emerald-500' :
              t.type === 'error' ? 'bg-red-50 text-red-500' :
              'bg-gray-50 text-gray-500'
            }`}>
              <i className={`fas ${
                t.type === 'success' ? 'fa-check' :
                t.type === 'error' ? 'fa-exclamation' :
                'fa-info-circle'
              }`} />
            </div>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
