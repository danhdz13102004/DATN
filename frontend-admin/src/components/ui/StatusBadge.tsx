type StatusVariant =
  | 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION'
  | 'PUBLISHED' | 'DRAFT' | 'CLOSED' | 'ARCHIVED'
  | 'APPLIED' | 'SCREENING' | 'INTERVIEW' | 'OFFER' | 'REJECTED' | 'HIRED' | 'WITHDRAWN'
  | boolean;

const CONFIG: Record<string, { label: string; className: string }> = {
  // User status
  ACTIVE:               { label: 'Active',      className: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  SUSPENDED:            { label: 'Suspended',   className: 'bg-red-50 text-red-600 border-red-100' },
  PENDING_VERIFICATION: { label: 'Pending',     className: 'bg-amber-50 text-amber-700 border-amber-100' },
  // Job status
  PUBLISHED:   { label: 'Published',   className: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  DRAFT:       { label: 'Draft',       className: 'bg-gray-50 text-gray-600 border-gray-200' },
  CLOSED:      { label: 'Closed',      className: 'bg-red-50 text-red-600 border-red-100' },
  ARCHIVED:    { label: 'Archived',    className: 'bg-gray-50 text-gray-500 border-gray-200' },
  // Application status
  APPLIED:     { label: 'Applied',     className: 'bg-blue-50 text-blue-700 border-blue-100' },
  SCREENING:   { label: 'Screening',   className: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
  INTERVIEW:   { label: 'Interview',   className: 'bg-purple-50 text-purple-700 border-purple-100' },
  OFFER:       { label: 'Offer',       className: 'bg-amber-50 text-amber-700 border-amber-100' },
  REJECTED:    { label: 'Rejected',    className: 'bg-red-50 text-red-600 border-red-100' },
  HIRED:       { label: 'Hired',       className: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  WITHDRAWN:   { label: 'Withdrawn',   className: 'bg-gray-50 text-gray-500 border-gray-200' },
  // Boolean (company verified)
  true:        { label: 'Verified',    className: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  false:       { label: 'Pending',     className: 'bg-amber-50 text-amber-700 border-amber-100' },
};

interface StatusBadgeProps {
  value: StatusVariant;
}

export default function StatusBadge({ value }: StatusBadgeProps) {
  const key = String(value);
  const cfg = CONFIG[key] ?? { label: key, className: 'bg-gray-50 text-gray-500 border-gray-200' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}
