interface ConfirmActionModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  icon?: string;
  tone?: 'danger' | 'warning';
  isLoading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ConfirmActionModal({
  open,
  title,
  message,
  confirmLabel,
  icon = 'fa-triangle-exclamation',
  tone = 'danger',
  isLoading = false,
  onClose,
  onConfirm,
}: ConfirmActionModalProps) {
  if (!open) return null;

  const toneClasses = {
    danger: {
      iconBg: 'bg-red-50 text-red-500 ring-red-100',
      confirm: 'bg-red-500 hover:bg-red-600 focus:ring-red-200',
    },
    warning: {
      iconBg: 'bg-amber-50 text-amber-500 ring-amber-100',
      confirm: 'bg-amber-500 hover:bg-amber-600 focus:ring-amber-200',
    },
  }[tone];

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) onClose();
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 animate-fadeSlideUp">
        <div className="p-6 text-center">
          <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl ring-8 ${toneClasses.iconBg}`}>
            <i className={`fas ${icon}`} />
          </div>
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-gray-500">{message}</p>
          <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-500">
            This action cannot be undone from the company portal.
          </div>
        </div>

        <div className="flex gap-3 border-t border-gray-100 bg-gray-50 p-4">
          <button
            type="button"
            className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-70 ${toneClasses.confirm}`}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Processing...
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
