interface TopbarProps {
  title: string;
  breadcrumbs?: { label: string; to?: string }[];
  onMenuToggle: () => void;
}

export default function Topbar({ title, breadcrumbs, onMenuToggle }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          onClick={onMenuToggle}
        >
          <i className="fas fa-bars" />
        </button>
        <div>
          {breadcrumbs && breadcrumbs.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-0.5">
              {breadcrumbs.map((bc, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  {bc.to ? (
                    <a href={bc.to} className="text-primary hover:underline">{bc.label}</a>
                  ) : (
                    <span className="text-gray-500">{bc.label}</span>
                  )}
                  {i < breadcrumbs.length - 1 && <i className="fas fa-chevron-right text-[0.6rem]" />}
                </span>
              ))}
            </div>
          )}
          <h1 className="text-lg font-bold text-gray-900">{title}</h1>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors relative">
          <i className="fas fa-bell" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>
      </div>
    </header>
  );
}
