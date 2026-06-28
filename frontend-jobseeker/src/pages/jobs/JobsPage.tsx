import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { jobService } from '../../services/jobService';
import { resumeService } from '../../services/resumeService';
import { locationService } from '../../services/locationService';
import { useAuthStore } from '../../store/authStore';
import type { Job, JobFilter, SavedJobDto } from '../../types/job';
import type { Resume } from '../../types/resume';

import BrowseJobsHeader from '../../components/jobs/BrowseJobsHeader';
import JobTabs from '../../components/jobs/JobTabs';
import JobFilterPanel from '../../components/jobs/JobFilterPanel';
import JobCard from '../../components/jobs/JobCard';
import RecommendedJobCard from '../../components/jobs/RecommendedJobCard';
import { JobsEmptyState, RecommendedEmptyState } from '../../components/jobs/JobsEmptyState';
import { JobsGridSkeleton, RecommendedGridSkeleton } from '../../components/jobs/JobsLoadingSkeleton';

type ViewMode = 'all' | 'recommended' | 'saved';

const DEFAULT_FILTERS: JobFilter = { page: 1, size: 12 };
const VALID_VIEW_MODES: ViewMode[] = ['all', 'recommended', 'saved'];

function readNumberParam(params: URLSearchParams, key: string) {
  const value = params.get(key);
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function filtersFromSearchParams(params: URLSearchParams): JobFilter {
  const filters: JobFilter = {
    page: readNumberParam(params, 'page') ?? DEFAULT_FILTERS.page,
    size: readNumberParam(params, 'size') ?? DEFAULT_FILTERS.size,
  };

  const keyword = params.get('keyword');
  const jobType = params.get('jobType');
  const experienceLevels = params.getAll('experienceLevels').filter(Boolean);

  if (keyword) filters.keyword = keyword;
  if (jobType) filters.jobType = jobType;
  if (experienceLevels.length) filters.experienceLevels = experienceLevels;

  const countryId = readNumberParam(params, 'countryId');
  const cityId = readNumberParam(params, 'cityId');
  const salaryMin = readNumberParam(params, 'salaryMin');
  const salaryMax = readNumberParam(params, 'salaryMax');

  if (countryId != null) filters.countryId = countryId;
  if (cityId != null) filters.cityId = cityId;
  if (salaryMin != null) filters.salaryMin = salaryMin;
  if (salaryMax != null) filters.salaryMax = salaryMax;

  return filters;
}

function viewModeFromSearchParams(params: URLSearchParams): ViewMode {
  const tab = params.get('tab') as ViewMode | null;
  return tab && VALID_VIEW_MODES.includes(tab) ? tab : 'all';
}

function searchParamsFromState(filters: JobFilter, viewMode: ViewMode) {
  const params = new URLSearchParams();

  if (viewMode !== 'all') params.set('tab', viewMode);
  if (filters.keyword) params.set('keyword', filters.keyword);
  if (filters.jobType) params.set('jobType', filters.jobType);
  filters.experienceLevels?.forEach(level => params.append('experienceLevels', level));
  if (filters.countryId != null) params.set('countryId', String(filters.countryId));
  if (filters.cityId != null) params.set('cityId', String(filters.cityId));
  if (filters.salaryMin != null) params.set('salaryMin', String(filters.salaryMin));
  if (filters.salaryMax != null) params.set('salaryMax', String(filters.salaryMax));
  if ((filters.page ?? DEFAULT_FILTERS.page) !== DEFAULT_FILTERS.page) params.set('page', String(filters.page));
  if ((filters.size ?? DEFAULT_FILTERS.size) !== DEFAULT_FILTERS.size) params.set('size', String(filters.size));

  return params;
}

function JobGridItem({
  saved,
  onNavigate,
  onUnsave,
  savePendingId,
}: {
  saved: SavedJobDto;
  onNavigate: (id: string) => void;
  onUnsave: (jobId: string) => void;
  savePendingId: string | null;
}) {
  const initial = saved.companyName
    ? saved.companyName.charAt(0).toUpperCase()
    : saved.jobTitle.charAt(0).toUpperCase();

  const isPending = savePendingId === saved.jobId;

  return (
    <article
      onClick={() => onNavigate(saved.jobId)}
      className="saved-card"
      style={{
        background: '#FFFFFF',
        border: '1px solid #E8ECF2',
        borderRadius: 20,
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease',
      }}
    >
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: 'linear-gradient(90deg, #F59E0B, #FBBF24)',
        opacity: 0,
        transition: 'opacity 0.3s ease',
      }} className="card-top-accent" />

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 18 }}>
        <div className="card-logo" style={{
          width: 58, height: 58, borderRadius: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: '1.35rem',
          background: 'linear-gradient(145deg, #FFF7ED, #FEF3C7)',
          color: '#D97706', flexShrink: 0,
          boxShadow: '0 4px 12px rgba(251, 191, 36, 0.15)',
          border: '1px solid rgba(251, 191, 36, 0.1)',
          transition: 'transform 0.25s ease',
        }}>
          {initial}
        </div>

        <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
          <h3 style={{
            fontSize: '1.05rem', fontWeight: 700, color: '#0F172A',
            lineHeight: 1.4, margin: '0 0 5px', letterSpacing: '-0.01em',
            overflow: 'hidden', textOverflow: 'ellipsis',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}>
            {saved.jobTitle}
          </h3>
          <div style={{
            fontSize: '0.88rem', color: '#64748B', fontWeight: 500,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {saved.companyName}
          </div>
        </div>

        <button
          onClick={async (e) => {
            e.stopPropagation();
            onUnsave(saved.jobId);
          }}
          disabled={isPending}
          title="Remove from saved"
          className="card-save-btn"
          style={{
            padding: 10, borderRadius: 12,
            background: 'rgba(251, 191, 36, 0.12)',
            border: '1px solid rgba(251, 191, 36, 0.25)',
            cursor: 'pointer', color: '#F59E0B',
            opacity: isPending ? 0.5 : 1, flexShrink: 0,
            transition: 'all 0.2s ease',
          }}
        >
          <i className="fas fa-bookmark" style={{ fontSize: '1rem' }} />
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {saved.location && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '5px 11px', background: '#F8FAFC',
            border: '1px solid #E2E7F0', borderRadius: 8,
            fontSize: '0.8rem', color: '#475569', fontWeight: 500,
          }}>
            <i className="fas fa-location-dot" style={{ color: '#2563EB', fontSize: '0.7rem' }} />
            {saved.location}
          </span>
        )}
        {saved.jobType && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '5px 11px', background: '#F0FDF4',
            border: '1px solid #BBF7D0', borderRadius: 8,
            fontSize: '0.8rem', color: '#15803D', fontWeight: 500,
          }}>
            <i className="fas fa-clock" style={{ fontSize: '0.7rem' }} />
            {saved.jobType.replace('FULLTIME', 'Full-time').replace('PARTTIME', 'Part-time').replace('REMOTE', 'Remote').replace('HYBRID', 'Hybrid')}
          </span>
        )}
        {saved.salaryMin && saved.salaryMax && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '5px 11px', background: '#F0FDF4',
            border: '1px solid #BBF7D0', borderRadius: 8,
            fontSize: '0.8rem', color: '#15803D', fontWeight: 500,
          }}>
            <i className="fas fa-dollar-sign" style={{ fontSize: '0.7rem' }} />
            ${saved.salaryMin.toLocaleString()} – ${saved.salaryMax.toLocaleString()}
          </span>
        )}
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginTop: 'auto', paddingTop: 18,
        borderTop: '1px solid #F1F5F9', gap: 12,
      }}>
        <div>
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#94A3B8', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Salary
          </p>
          <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#F59E0B' }}>
            {saved.salaryMin && saved.salaryMax
              ? `$${saved.salaryMin.toLocaleString()} – $${saved.salaryMax.toLocaleString()}`
              : 'Negotiable'}
          </span>
        </div>
        <span className="card-view-btn" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '10px 20px',
          background: 'linear-gradient(135deg, #D97706, #F59E0B)',
          color: '#FFFFFF', fontSize: '0.875rem', fontWeight: 600,
          borderRadius: 12, boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
          border: 'none', cursor: 'pointer', transition: 'all 0.2s ease',
          fontFamily: 'inherit', flexShrink: 0,
        }}>
          View Details
          <i className="fas fa-arrow-right" style={{ fontSize: '0.72rem' }} />
        </span>
      </div>

      <style>{`
        .saved-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 16px 48px rgba(251, 191, 36, 0.1), 0 0 0 1px rgba(245,158,11,0.08);
          border-color: #FDE68A;
        }
        .saved-card:hover .card-top-accent { opacity: 1 !important; }
        .saved-card:hover .card-logo { transform: scale(1.06); }
        .saved-card:hover .card-view-btn { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(245,158,11,0.4); }
        .card-save-btn:hover {
          background: #FEE2E2 !important; color: #DC2626 !important;
          border-color: #FECACA !important; transform: scale(1.08);
        }
      `}</style>
    </article>
  );
}

export default function JobsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalJobs, setTotalJobs] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [draftFilters, setDraftFilters] = useState<JobFilter>(() => filtersFromSearchParams(searchParams));
  const [filters, setFilters] = useState<JobFilter>(() => filtersFromSearchParams(searchParams));
  const [viewMode, setViewMode] = useState<ViewMode>(() => viewModeFromSearchParams(searchParams));
  const [savedJobs, setSavedJobs] = useState<SavedJobDto[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [savedTotal, setSavedTotal] = useState(0);
  const [savePendingId, setSavePendingId] = useState<string | null>(null);
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [recommendedJobs, setRecommendedJobs] = useState<{ job: Job; score: number }[]>([]);
  const [recommendLoading, setRecommendLoading] = useState(false);
  const [recommendError, setRecommendError] = useState<string | null>(null);
  const [recommendMode, setRecommendMode] = useState(true); // true = resume, false = activities
  const [recommendMeta, setRecommendMeta] = useState<Record<string, unknown>>({});
  const currentJobsPath = `${location.pathname}${location.search}`;

  // Auto-detect user's country by IP on mount
  useEffect(() => {
    if (searchParams.toString()) return;

    locationService.detectCountryByIp()
      .then(res => {
        if (res.data.data) {
          setDraftFilters(f => ({ ...f, countryId: res.data.data!.id }));
        }
      })
      .catch(() => { /* silent — no country auto-selected */ });
  }, [searchParams]);

  useEffect(() => {
    const nextFilters = filtersFromSearchParams(searchParams);
    const nextViewMode = viewModeFromSearchParams(searchParams);
    setFilters(nextFilters);
    setDraftFilters(nextFilters);
    setViewMode(nextViewMode);
  }, [searchParams]);

  useEffect(() => {
    const nextParams = searchParamsFromState(filters, viewMode);
    if (nextParams.toString() !== searchParams.toString()) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [filters, viewMode, searchParams, setSearchParams]);

  const fetchJobs = (f: JobFilter) => {
    setLoading(true);
    jobService.listJobs(f).then((res) => {
      setJobs(res.data ?? []);
      if (res.meta) {
        setTotalJobs(res.meta.total ?? 0);
        setTotalPages(Math.ceil(res.meta.total / (f.size ?? 12)));
      }
    }).catch(console.error)
      .finally(() => setLoading(false));
  };

  const fetchSavedJobs = () => {
    setSavedLoading(true);
    jobService.getSavedJobs().then((res) => {
      const validSavedJobs = (res.data ?? []).filter(
        (saved): saved is SavedJobDto => Boolean(saved?.savedJobId && saved.jobId)
      );
      setSavedJobs(validSavedJobs);
      setSavedTotal(res.meta?.total ?? validSavedJobs.length);
    }).catch(console.error)
      .finally(() => setSavedLoading(false));
  };

  const fetchRecommendations = (resumeId: string, useResume: boolean) => {
    setRecommendLoading(true);
    setRecommendError(null);
    jobService.getRecommendations(resumeId, 25, useResume ? 'resume' : 'activities')
      .then((res) => {
        setRecommendedJobs(res.recommendations ?? []);
        setRecommendMeta(res.meta ?? {});
      })
      .catch(() => setRecommendError('Failed to load recommendations. Please try again.'))
      .finally(() => setRecommendLoading(false));
  };

  useEffect(() => {
    if (!isAuthenticated && viewMode !== 'all') {
      setViewMode('all');
      return;
    }

    if (viewMode === 'recommended') {
      resumeService.listResumes()
        .then(list => {
          setResumes(list);
          const primary = list.find((r: Resume) => r.isPrimary) ?? list[0] ?? null;
          if (primary) setSelectedResumeId(primary.id);
        })
        .catch(() => setResumes([]));
    }
  }, [isAuthenticated, viewMode]);

  useEffect(() => {
    if (isAuthenticated && viewMode === 'recommended' && selectedResumeId) {
      fetchRecommendations(selectedResumeId, recommendMode);
    }
  }, [isAuthenticated, viewMode, selectedResumeId, recommendMode]);

  // Auto-select a resume when switching to activities mode
  useEffect(() => {
    if (!recommendMode && resumes.length > 0 && !selectedResumeId) {
      const primary = resumes.find((r: Resume) => r.isPrimary) ?? resumes[0];
      setSelectedResumeId(primary.id);
    }
  }, [recommendMode, resumes, selectedResumeId]);

  useEffect(() => { fetchJobs(filters); }, [filters]);

  useEffect(() => {
    if (!isAuthenticated) return;
    jobService.getAppliedJobIds().then(ids => {
      setAppliedJobIds(new Set(ids));
    }).catch(() => {});
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && viewMode === 'saved') fetchSavedJobs();
  }, [isAuthenticated, viewMode]);

  const handleToggleSave = async (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate('/login', { state: { from: currentJobsPath } });
      return;
    }
    if (savePendingId === jobId) return;
    setSavePendingId(jobId);

    const allJobs = [...jobs, ...recommendedJobs.map(r => r.job)];
    const job = allJobs.find(j => j.id === jobId);
    const wasSaved = job?.isSaved ?? false;

    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, isSaved: !wasSaved } : j));
    setRecommendedJobs(prev => prev.map(r => r.job.id === jobId ? { ...r, job: { ...r.job, isSaved: !wasSaved } } : r));

    try {
      if (wasSaved) {
        await jobService.unsaveJob(jobId);
        if (viewMode === 'saved') {
          setSavedJobs(prev => prev.filter(s => s.jobId !== jobId));
        }
      } else {
        await jobService.saveJob(jobId);
        jobService.logInteraction(jobId, 'save');
      }
    } catch {
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, isSaved: wasSaved } : j));
      setRecommendedJobs(prev => prev.map(r => r.job.id === jobId ? { ...r, job: { ...r.job, isSaved: wasSaved } } : r));
    } finally {
      setSavePendingId(null);
    }
  };

  const handleUnsaveSavedJob = async (jobId: string) => {
    if (savePendingId === jobId) return;
    setSavePendingId(jobId);
    try {
      await jobService.unsaveJob(jobId);
      setSavedJobs(prev => prev.filter(s => s.jobId !== jobId));
      setSavedTotal(t => Math.max(0, t - 1));
    } finally {
      setSavePendingId(null);
    }
  };

  const handleApplyFilters = (nextFilters?: JobFilter) => {
    setFilters({ ...(nextFilters ?? draftFilters), page: 1, size: filters.size ?? 12 });
  };

  const handleResetFilters = () => {
    setDraftFilters(DEFAULT_FILTERS);
    setFilters(DEFAULT_FILTERS);
  };

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gap: 20,
    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, paddingBottom: 40 }}>
      {/* Hero Header */}
      <BrowseJobsHeader totalJobs={totalJobs} />

      {/* Tab switcher */}
      <JobTabs
        activeTab={viewMode}
        onTabChange={setViewMode}
        savedCount={savedTotal}
        isAuthenticated={isAuthenticated}
        jobsCount={jobs.length}
        totalJobs={totalJobs}
      />

      {/* Filter panel — shown only on All Jobs tab */}
      {viewMode === 'all' && (
        <JobFilterPanel
          draftFilters={draftFilters}
          onDraftChange={setDraftFilters}
          onApply={handleApplyFilters}
        />
      )}

      {/* ─── All Jobs ─── */}
      {viewMode === 'all' && (
        loading
          ? <JobsGridSkeleton count={6} />
          : jobs.length === 0
            ? <JobsEmptyState
                icon="fa-briefcase"
                title="No jobs found"
                description="Try adjusting your filters or search keyword."
                action={{ label: 'Reset filters', onClick: handleResetFilters }}
              />
            : <>
                <div style={gridStyle}>
                  {jobs.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      isApplied={appliedJobIds.has(job.id)}
                      onClick={() => navigate(`/jobs/${job.id}`, { state: { from: currentJobsPath } })}
                      onToggleSave={handleToggleSave}
                      savePendingId={savePendingId}
                    />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    <button
                      onClick={() => setFilters(f => ({ ...f, page: Math.max(1, f.page! - 1) }))}
                      disabled={filters.page === 1}
                      style={{
                        width: 44, height: 44, borderRadius: 12,
                        fontSize: '0.95rem', fontWeight: 600,
                        border: '2px solid #E2E7F0',
                        background: '#FFFFFF', color: '#64748B',
                        cursor: 'pointer', fontFamily: 'inherit',
                        transition: 'all 0.2s ease',
                        opacity: filters.page === 1 ? 0.4 : 1,
                      }}
                    >
                      <i className="fas fa-chevron-left" style={{ fontSize: '0.75rem' }} />
                    </button>

                    {(() => {
                      const current = filters.page!;
                      const pages: (number | '...')[] = [];
                      const delta = 2;

                      if (totalPages <= 7) {
                        for (let i = 1; i <= totalPages; i++) pages.push(i);
                      } else {
                        pages.push(1);
                        if (current - delta > 2) pages.push('...');
                        for (let i = Math.max(2, current - delta); i <= Math.min(totalPages - 1, current + delta); i++) {
                          pages.push(i);
                        }
                        if (current + delta < totalPages - 1) pages.push('...');
                        pages.push(totalPages);
                      }

                      return pages.map((p, idx) => p === '...'
                        ? <span key={`ellipsis-${idx}`} style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: '0.9rem', fontWeight: 600 }}>…</span>
                        : <button
                            key={p}
                            onClick={() => setFilters(f => ({ ...f, page: p as number }))}
                            className="page-btn"
                            style={{
                              width: 44, height: 44, borderRadius: 12,
                              fontSize: '0.95rem', fontWeight: 600,
                              border: current === p ? 'none' : '2px solid #E2E7F0',
                              background: current === p
                                ? 'linear-gradient(135deg, #1E40AF, #2563EB)'
                                : '#FFFFFF',
                              color: current === p ? '#FFFFFF' : '#64748B',
                              cursor: 'pointer', fontFamily: 'inherit',
                              transition: 'all 0.2s ease',
                              boxShadow: current === p ? '0 4px 12px rgba(37,99,235,0.3)' : '0 1px 3px rgba(0,0,0,0.04)',
                            }}
                            onMouseEnter={e => {
                              if (current !== p) {
                                (e.currentTarget as HTMLElement).style.borderColor = '#2563EB';
                                (e.currentTarget as HTMLElement).style.color = '#2563EB';
                                (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                              }
                            }}
                            onMouseLeave={e => {
                              if (current !== p) {
                                (e.currentTarget as HTMLElement).style.borderColor = '#E2E7F0';
                                (e.currentTarget as HTMLElement).style.color = '#64748B';
                                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                              }
                            }}
                          >
                            {p}
                          </button>
                      );
                    })()}

                    <button
                      onClick={() => setFilters(f => ({ ...f, page: Math.min(totalPages, f.page! + 1) }))}
                      disabled={filters.page === totalPages}
                      style={{
                        width: 44, height: 44, borderRadius: 12,
                        fontSize: '0.95rem', fontWeight: 600,
                        border: '2px solid #E2E7F0',
                        background: '#FFFFFF', color: '#64748B',
                        cursor: 'pointer', fontFamily: 'inherit',
                        transition: 'all 0.2s ease',
                        opacity: filters.page === totalPages ? 0.4 : 1,
                      }}
                    >
                      <i className="fas fa-chevron-right" style={{ fontSize: '0.75rem' }} />
                    </button>
                  </div>
                )}
              </>
      )}

      {/* ─── Recommended ─── */}
      {viewMode === 'recommended' && (
        <div style={{
          borderRadius: 24,
          padding: 32,
          background: 'linear-gradient(135deg, rgba(99,102,241,0.04), rgba(37,99,235,0.04))',
          border: '1px solid rgba(99,102,241,0.15)',
          boxShadow: '0 4px 20px rgba(99,102,241,0.06)',
        }}>
          {/* Section header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 28, flexWrap: 'wrap', gap: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <div style={{
                width: 60, height: 60, borderRadius: 18,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
                boxShadow: '0 8px 24px rgba(99, 102, 241, 0.35)',
                fontSize: '1.5rem', color: '#FFFFFF',
              }}>
                <i className="fas fa-wand-magic-sparkles" />
              </div>
              <div>
                <h3 style={{
                  fontSize: '1.3rem', fontWeight: 700, color: '#0F172A',
                  margin: 0, letterSpacing: '-0.02em',
                }}>
                  Recommended For You
                </h3>
                <p style={{
                  fontSize: '0.9rem', color: '#64748B', margin: '4px 0 0',
                }}>
                  {recommendMode
                    ? 'AI-matched jobs based on your selected resume and profile.'
                    : 'AI-matched jobs based on your recent browsing activity.'}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              {/* Resume selector — only shown in resume mode */}
              {recommendMode && (
                <>
                  {resumes.length > 0 ? (
                    <div style={{ position: 'relative' }}>
                      <select
                        style={{
                          padding: '12px 44px 12px 18px',
                          border: '2px solid #E2E7F0',
                          borderRadius: 14,
                          fontSize: '0.9rem',
                          color: '#0F172A',
                          outline: 'none',
                          background: '#FFFFFF',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          appearance: 'none',
                          WebkitAppearance: 'none',
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%2364748B' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10l-5 5z'/%3E%3C/svg%3E")`,
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 14px center',
                          transition: 'all 0.2s ease',
                        }}
                        onFocus={e => {
                          (e.target as HTMLElement).style.borderColor = '#6366F1';
                          (e.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)';
                        }}
                        onBlur={e => {
                          (e.target as HTMLElement).style.borderColor = '#E2E7F0';
                          (e.target as HTMLElement).style.boxShadow = 'none';
                        }}
                        value={selectedResumeId ?? ''}
                        onChange={e => setSelectedResumeId(e.target.value || null)}
                      >
                        {resumes.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.label ?? 'Resume'} {r.isPrimary ? '(Primary)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <button
                      onClick={() => navigate('/resumes')}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '12px 22px', fontSize: '0.9rem',
                        color: '#64748B', background: '#FFFFFF',
                        border: '2px solid #E2E7F0', borderRadius: 14,
                        cursor: 'pointer', fontFamily: 'inherit',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.borderColor = '#6366F1';
                        (e.currentTarget as HTMLElement).style.color = '#6366F1';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.borderColor = '#E2E7F0';
                        (e.currentTarget as HTMLElement).style.color = '#64748B';
                      }}
                    >
                      <i className="fas fa-plus" /> Add Resume
                    </button>
                  )}
                </>
              )}

              {/* Mode toggle: resume vs activities */}
              <div style={{
                display: 'flex',
                background: '#F1F5F9',
                borderRadius: 50,
                padding: 4,
                gap: 0,
              }}>
                <button
                  onClick={() => setRecommendMode(true)}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 50,
                    border: 'none',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    transition: 'all 0.25s ease',
                    background: recommendMode
                      ? 'linear-gradient(135deg, #6366F1, #4F46E5)'
                      : 'transparent',
                    color: recommendMode ? '#FFFFFF' : '#64748B',
                    boxShadow: recommendMode
                      ? '0 4px 12px rgba(99,102,241,0.3)'
                      : 'none',
                  }}
                >
                  Resume
                </button>
                <button
                  onClick={() => setRecommendMode(false)}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 50,
                    border: 'none',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    transition: 'all 0.25s ease',
                    background: !recommendMode
                      ? 'linear-gradient(135deg, #F59E0B, #D97706)'
                      : 'transparent',
                    color: !recommendMode ? '#FFFFFF' : '#64748B',
                    boxShadow: !recommendMode
                      ? '0 4px 12px rgba(245,158,11,0.3)'
                      : 'none',
                  }}
                >
                  Activities
                </button>
              </div>

              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 18px', borderRadius: 50,
                fontSize: '0.8rem', fontWeight: 600,
                background: 'rgba(99,102,241,0.08)',
                color: '#6D28D9',
                border: '1px solid rgba(99,102,241,0.2)',
                letterSpacing: '0.03em',
              }}>
                <i className="fas fa-robot" /> AI Powered
              </span>
            </div>
          </div>

          {recommendLoading ? (
            <RecommendedGridSkeleton count={4} />
          ) : recommendError ? (
            <div style={{
              textAlign: 'center', padding: 48,
              color: '#EF4444', background: '#FEF2F2',
              borderRadius: 16, border: '1px solid #FECACA',
            }}>
              <i className="fas fa-circle-exclamation" style={{ fontSize: '2.5rem', marginBottom: 16, display: 'block' }} />
              <p style={{ fontSize: '1rem', margin: 0 }}>{recommendError}</p>
            </div>
          ) : resumes.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '48px 24px',
            }}>
              <div style={{
                width: 100, height: 100, borderRadius: 28,
                background: 'linear-gradient(135deg, #DBEAFE, #E0E7FF)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
                boxShadow: '0 8px 24px rgba(37,99,235,0.12)',
              }}>
                <i className="fas fa-file-pdf" style={{ fontSize: '2.2rem', color: '#2563EB' }} />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0F172A', margin: '0 0 10px' }}>
                No resume yet
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#64748B', margin: '0 0 24px', maxWidth: 380, marginLeft: 'auto', marginRight: 'auto' }}>
                Upload a resume to get AI-powered job recommendations tailored to your skills and experience.
              </p>
              <button
                onClick={() => navigate('/resumes')}
                style={{
                  padding: '14px 28px',
                  background: 'linear-gradient(135deg, #4F46E5, #6366F1)',
                  color: '#FFFFFF', fontSize: '0.95rem', fontWeight: 600,
                  border: 'none', borderRadius: 14,
                  cursor: 'pointer', fontFamily: 'inherit',
                  boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 20px rgba(99,102,241,0.4)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 14px rgba(99,102,241,0.35)';
                }}
              >
                <i className="fas fa-upload" style={{ marginRight: 8 }} />
                Upload Resume
              </button>
            </div>
          ) : !recommendMode && recommendMeta && recommendMeta.has_signals === false ? (
            <div style={{
              textAlign: 'center', padding: '48px 24px',
            }}>
              <div style={{
                width: 100, height: 100, borderRadius: 28,
                background: 'linear-gradient(135deg, #FEF3C7, #FDE68A)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
                boxShadow: '0 8px 24px rgba(245,158,11,0.12)',
              }}>
                <i className="fas fa-chart-line" style={{ fontSize: '2.2rem', color: '#D97706' }} />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0F172A', margin: '0 0 10px' }}>
                No activity data yet
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#64748B', margin: '0 0 24px', maxWidth: 380, marginLeft: 'auto', marginRight: 'auto' }}>
                Start clicking or saving jobs to see recommendations based on your browsing activity.
              </p>
              <button
                onClick={() => setViewMode('all')}
                style={{
                  padding: '14px 28px',
                  background: 'linear-gradient(135deg, #D97706, #F59E0B)',
                  color: '#FFFFFF', fontSize: '0.95rem', fontWeight: 600,
                  border: 'none', borderRadius: 14,
                  cursor: 'pointer', fontFamily: 'inherit',
                  boxShadow: '0 4px 14px rgba(245,158,11,0.35)',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 20px rgba(245,158,11,0.4)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 14px rgba(245,158,11,0.35)';
                }}
              >
                <i className="fas fa-search" style={{ marginRight: 8 }} />
                Browse Jobs
              </button>
            </div>
          ) : recommendedJobs.length === 0 ? (
            <RecommendedEmptyState description={!recommendMode
              ? "No recommendations found based on your activity. Try browsing and saving more jobs."
              : "Try selecting a different resume or check back when more jobs are available."} />
          ) : (
            <div style={gridStyle}>
              {recommendedJobs.map(({ job, score }) => (
                <RecommendedJobCard
                  key={job.id}
                  job={job}
                  isApplied={appliedJobIds.has(job.id)}
                  score={score}
                  showMatchScore={recommendMode}
                  onClick={() => navigate(`/jobs/${job.id}`, { state: { from: currentJobsPath } })}
                  onToggleSave={handleToggleSave}
                  savePendingId={savePendingId}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Saved Jobs ─── */}
      {viewMode === 'saved' && (
        savedLoading
          ? <JobsGridSkeleton count={3} />
          : savedJobs.length === 0
            ? <JobsEmptyState
                icon="fa-bookmark"
                title="No saved jobs"
                description="Save jobs you're interested in to review them later."
                action={{ label: 'Browse jobs', onClick: () => setViewMode('all') }}
              />
            : <>
                <div style={gridStyle}>
                  {savedJobs.map((saved) => (
                    <JobGridItem
                      key={saved.savedJobId}
                      saved={saved}
                      onNavigate={id => navigate(`/jobs/${id}`, { state: { from: currentJobsPath } })}
                      onUnsave={handleUnsaveSavedJob}
                      savePendingId={savePendingId}
                    />
                  ))}
                </div>
              </>
      )}
    </div>
  );
}
