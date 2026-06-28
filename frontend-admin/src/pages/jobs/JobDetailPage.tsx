import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import Topbar from '../../components/layout/Topbar';
import StatusBadge from '../../components/ui/StatusBadge';
import { useAdminJobDetail, useDeleteAdminJob } from '../../hooks/useAdminJobs';
import { useToast } from '../../contexts/ToastContext';
import { ROUTES } from '../../constants';

interface OutletCtx { onMenuToggle: () => void; }

const JOB_TYPE_LABELS: Record<string, string> = {
  FULLTIME: 'Full-time',
  PARTTIME: 'Part-time',
  REMOTE: 'Remote',
  HYBRID: 'Hybrid',
};

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString();
};

const formatMoney = (min?: number | null, max?: number | null) => {
  if (min == null && max == null) return 'Negotiable';
  const fmt = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  if (min != null && max != null) return `${fmt.format(min)} - ${fmt.format(max)}`;
  if (min != null) return `From ${fmt.format(min)}`;
  return `Up to ${fmt.format(max!)}`;
};

const labelize = (value?: string | null) => {
  if (!value) return '-';
  return JOB_TYPE_LABELS[value] ?? value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (char: string) => char.toUpperCase());
};

function InfoItem({ label, value, icon }: { label: string; value: React.ReactNode; icon: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase text-gray-400">
        <i className={`fas ${icon}`} />
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold text-gray-900">{value || '-'}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-base font-bold text-gray-900 mb-4">{title}</h2>
      {children}
    </section>
  );
}

function ListSection({ title, items }: { title: string; items?: string[] | null }) {
  if (!items?.length) return null;
  return (
    <Section title={title}>
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={`${title}-${index}`} className="flex gap-3 text-sm text-gray-600 leading-relaxed">
            <i className="fas fa-check-circle text-primary mt-1 text-xs" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

interface DeleteJobModalProps {
  jobTitle: string;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

function DeleteJobModal({ jobTitle, isPending, onClose, onConfirm }: DeleteJobModalProps) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (isPending) return;
    onConfirm();
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 animate-overlay"
      onClick={(event) => event.target === event.currentTarget && !isPending && onClose()}
    >
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-modal">
        <div className="p-6 border-b border-gray-100 flex items-start justify-between gap-4">
          <div>
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mb-4">
              <i className="fas fa-trash" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Delete Job</h3>
            <p className="text-sm text-gray-500 mt-1">
              This will remove the job from listings and notify the company.
            </p>
          </div>
          <button
            type="button"
            className="text-gray-400 hover:text-gray-600 transition-colors"
            onClick={onClose}
            disabled={isPending}
            aria-label="Close"
          >
            <i className="fas fa-times" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3">
            <p className="text-sm font-semibold text-red-700 break-words">{jobTitle}</p>
          </div>
        </div>

        <div className="flex gap-3 p-5 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button
            type="button"
            className="flex-1 px-4 py-2.5 border border-gray-200 text-sm rounded-xl font-medium hover:bg-gray-100 transition-colors text-gray-700"
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 px-4 py-2.5 bg-red-600 text-white text-sm rounded-xl font-semibold hover:bg-red-700 disabled:opacity-60 transition-colors"
            disabled={isPending}
          >
            {isPending ? 'Deleting...' : 'Confirm Delete'}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}

export default function JobDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { onMenuToggle } = useOutletContext<OutletCtx>();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: job, isLoading, isError } = useAdminJobDetail(id);
  const deleteJob = useDeleteAdminJob();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const infoItems = useMemo(() => {
    if (!job) return [];
    return [
      { label: 'Company', value: job.company?.name ?? job.companyId, icon: 'fa-building' },
      { label: 'Type', value: labelize(job.jobType), icon: 'fa-clock' },
      { label: 'Location', value: job.location ?? '-', icon: 'fa-location-dot' },
      { label: 'Salary', value: formatMoney(job.salaryMin, job.salaryMax), icon: 'fa-dollar-sign' },
      { label: 'Experience', value: job.experienceLevels?.map(labelize).join(', ') || '-', icon: 'fa-signal' },
      { label: 'Industry', value: job.industry?.name ?? '-', icon: 'fa-layer-group' },
      { label: 'Created', value: formatDate(job.createdAt), icon: 'fa-calendar-plus' },
      { label: 'Updated', value: formatDate(job.updatedAt), icon: 'fa-calendar-check' },
    ];
  }, [job]);

  const handleDelete = async () => {
    if (!id || !job) return;

    try {
      await deleteJob.mutateAsync(id);
      setShowDeleteModal(false);
      toast.success('Job deleted and company notified');
      navigate(ROUTES.JOBS);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ??
        'Failed to delete job';
      toast.error(message);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col flex-1">
        <Topbar title="Job Detail" breadcrumbs={[{ label: 'Dashboard', to: ROUTES.DASHBOARD }, { label: 'Jobs', to: ROUTES.JOBS }, { label: 'Loading' }]} onMenuToggle={onMenuToggle} />
        <div className="p-6 space-y-4">
          <div className="h-32 bg-white rounded-2xl border border-gray-100 animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <div key={i} className="h-24 bg-white rounded-2xl border border-gray-100 animate-pulse" />)}
          </div>
        </div>
      </div>
    );
  }

  if (isError || !job) {
    return (
      <div className="flex flex-col flex-1">
        <Topbar title="Job Not Found" breadcrumbs={[{ label: 'Dashboard', to: ROUTES.DASHBOARD }, { label: 'Jobs', to: ROUTES.JOBS }, { label: 'Not Found' }]} onMenuToggle={onMenuToggle} />
        <div className="p-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-500">
            <i className="fas fa-briefcase text-4xl mb-4 text-gray-300" />
            <h2 className="text-lg font-bold text-gray-900">Job not found</h2>
            <p className="mt-2 text-sm">This job may have already been deleted.</p>
            <Link to={ROUTES.JOBS} className="inline-flex mt-5 px-4 py-2 rounded-lg bg-primary text-white text-sm">
              Back to Jobs
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Job Detail"
        breadcrumbs={[{ label: 'Dashboard', to: ROUTES.DASHBOARD }, { label: 'Jobs', to: ROUTES.JOBS }, { label: job.title }]}
        onMenuToggle={onMenuToggle}
      />

      <div className="p-6 space-y-5">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
                <StatusBadge value={job.status} />
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {job.company?.name ?? 'Unknown company'} {job.location ? `- ${job.location}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to={ROUTES.JOBS}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
              >
                <i className="fas fa-arrow-left text-xs" />
                Back
              </Link>
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                disabled={deleteJob.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60"
              >
                <i className="fas fa-trash text-xs" />
                {deleteJob.isPending ? 'Deleting...' : 'Delete Job'}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {infoItems.map((item) => (
            <InfoItem key={item.label} label={item.label} value={item.value} icon={item.icon} />
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5">
          <div className="space-y-5">
            {job.description && (
              <Section title="Description">
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{job.description}</p>
              </Section>
            )}

            <ListSection title="Responsibilities" items={job.responsibilities} />
            <ListSection title="Requirements" items={job.requirements} />
            <ListSection title="Nice-to-have Skills" items={job.niceToHaveSkills} />

            {!!job.skills?.length && (
              <Section title="Required Skills">
                <div className="flex flex-wrap gap-2">
                  {job.skills.map((skill) => (
                    <span key={skill.id} className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/10">
                      {skill.name}
                    </span>
                  ))}
                </div>
              </Section>
            )}

            {job.attachmentUrl && (
              <Section title="Attachment">
                <a
                  href={job.attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-medium text-primary no-underline"
                >
                  <i className="fas fa-paperclip text-gray-400" />
                  <span>View Attachment</span>
                  <i className="fas fa-external-link-alt text-xs ml-1" />
                </a>
              </Section>
            )}
          </div>

          <aside className="space-y-5">
            <Section title="Company">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold overflow-hidden">
                  {job.company?.logoUrl ? (
                    <img src={job.company.logoUrl} alt={job.company.name} className="w-full h-full object-cover" />
                  ) : (
                    (job.company?.name ?? 'C').charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{job.company?.name ?? 'Unknown company'}</div>
                  <div className="text-xs text-gray-400">{job.company?.verified ? 'Verified company' : 'Unverified company'}</div>
                </div>
              </div>
              {job.company?.description && <p className="mt-4 text-sm text-gray-600 leading-relaxed">{job.company.description}</p>}
              <div className="mt-4 space-y-2 text-sm text-gray-600">
                <div><span className="font-medium text-gray-900">Staff:</span> {job.company?.staffCount ?? '-'}</div>
                <div><span className="font-medium text-gray-900">Active jobs:</span> {job.company?.activeJobsCount ?? '-'}</div>
                <div><span className="font-medium text-gray-900">Website:</span> {job.company?.website ? <a className="text-primary" href={job.company.website} target="_blank" rel="noreferrer">Open site</a> : '-'}</div>
              </div>
            </Section>

          </aside>
        </div>
      </div>

      {showDeleteModal && (
        <DeleteJobModal
          jobTitle={job.title}
          isPending={deleteJob.isPending}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
