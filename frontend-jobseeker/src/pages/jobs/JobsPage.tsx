import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { jobService } from '../../services/jobService';
import type { Job, JobFilter, SavedJobDto, Skill } from '../../types/job';

const JOB_TYPES = ['FULLTIME', 'PARTTIME', 'REMOTE', 'HYBRID'];
const EXP_LEVELS = ['INTERN', 'FRESHER', 'JUNIOR', 'MIDDLE', 'SENIOR', 'LEADER'];

function JobCard({ job, onClick, onToggleSave, savePendingId }: {
  job: Job;
  onClick: () => void;
  onToggleSave: (jobId: string, e: React.MouseEvent) => void;
  savePendingId: string | null;
}) {
  const initial = job.companyName ? job.companyName.charAt(0).toUpperCase() : job.title.charAt(0).toUpperCase();
  const formatSalary = (min: number | null, max: number | null) => {
    if (!min && !max) return 'Negotiable';
    if (min && max) return `$${min.toLocaleString()} – $${max.toLocaleString()}`;
    if (min) return `From $${min.toLocaleString()}`;
    return `Up to $${max!.toLocaleString()}`;
  };

  return (
    <article
      onClick={onClick}
      className="bg-white border border-[#eef0f4] rounded-[14px] p-6 flex flex-col cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-[#6ea3f7] group"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)')}
    >
      {/* Top: logo + title */}
      <div className="flex items-start gap-3.5 mb-4">
        <div
          className="w-12 h-12 rounded-[10px] flex items-center justify-center font-bold text-lg shrink-0"
          style={{ background: 'rgba(66,135,245,0.08)', color: '#2b6de0' }}
        >
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[1.02rem] font-semibold text-[#1a1d26] leading-snug group-hover:text-primary transition-colors">
            {job.title}
          </h3>
          <div className="text-sm text-[#5f6780] mt-0.5">
            {job.companyName || 'Company'}
          </div>
        </div>
        {/* Save button */}
        <button
          onClick={(e) => onToggleSave(job.id, e)}
          disabled={savePendingId === job.id}
          title={job.isSaved ? 'Unsave' : 'Save'}
          className={`p-1.5 rounded-md transition-colors disabled:opacity-40 ${
            job.isSaved
              ? 'text-amber-500 hover:text-amber-600'
              : 'text-[#c8cdd9] hover:text-[#5f6780]'
          }`}
        >
          <i className={`${job.isSaved ? 'fas' : 'far'} fa-bookmark text-base`} />
        </button>
      </div>

      {/* Meta: location, type, level */}
      <div className="flex flex-wrap gap-3 text-[0.82rem] text-[#8b92a8] mb-3.5">
        {job.location && (
          <span className="flex items-center gap-1.5">
            <i className="fas fa-map-marker-alt" /> {job.location}
          </span>
        )}
        {job.jobType && (
          <span className="flex items-center gap-1.5">
            <i className="fas fa-clock" /> {job.jobType.replace('FULLTIME', 'Full-time').replace('PARTTIME', 'Part-time').replace('REMOTE', 'Remote').replace('HYBRID', 'Hybrid')}
          </span>
        )}
        {job.experienceLevels?.[0] && (
          <span className="flex items-center gap-1.5">
            <i className="fas fa-layer-group" /> {job.experienceLevels[0]}
          </span>
        )}
      </div>

      {/* Tags/skills */}
      {(job.skills && job.skills.length > 0) && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {job.skills.slice(0, 4).map((skill: Skill) => (
            <span
              key={skill.id}
              className="inline-flex items-center px-3 py-1 rounded-full text-[0.8rem] font-medium"
              style={{ background: 'rgba(66,135,245,0.08)', color: '#1a56c4' }}
            >
              {skill.name}
            </span>
          ))}
        </div>
      )}

      {/* Footer: salary + action */}
      <div
        className="flex items-center justify-between mt-auto pt-4"
        style={{ borderTop: '1px solid #eef0f4' }}
      >
        <span className="text-[0.95rem] font-semibold text-[#2b6de0]">
          {formatSalary(job.salaryMin, job.salaryMax)}
        </span>
        <span className="px-3.5 py-1.5 bg-primary text-white text-[0.82rem] font-semibold rounded-md hover:bg-[#2b6de0] transition-colors"
          style={{ boxShadow: '0 2px 8px rgba(66,135,245,0.25)' }}
        >
          View Details
        </span>
      </div>
    </article>
  );
}

type ViewMode = 'all' | 'recommended' | 'saved';

export default function JobsPage() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalJobs, setTotalJobs] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState<JobFilter>({ page: 1, size: 12 });
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [savedJobs, setSavedJobs] = useState<SavedJobDto[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [savedTotal, setSavedTotal] = useState(0);
  const [savePendingId, setSavePendingId] = useState<string | null>(null);

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
      setSavedJobs(res.data ?? []);
      setSavedTotal(res.meta?.total ?? 0);
    }).catch(console.error)
      .finally(() => setSavedLoading(false));
  };

  useEffect(() => { fetchJobs(filters); }, [filters]);

  useEffect(() => {
    if (viewMode === 'saved') fetchSavedJobs();
  }, [viewMode]);

  const handleToggleSave = async (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (savePendingId === jobId) return;
    setSavePendingId(jobId);

    const job = jobs.find(j => j.id === jobId);
    const wasSaved = job?.isSaved ?? false;

    // Optimistic update in the jobs list
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, isSaved: !wasSaved } : j));

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
      // Revert on failure
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, isSaved: wasSaved } : j));
    } finally {
      setSavePendingId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-2">
        <div>
          <h2 className="text-[1.55rem] font-bold tracking-tight text-[#1a1d26]">Find Your Dream Job</h2>
          <p className="text-[0.9rem] text-[#5f6780] mt-0.5">
            Discover {totalJobs > 0 ? totalJobs : ''} opportunities matching your profile
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex gap-1 bg-[#f4f6fa] p-1 rounded-md">
          <button
            onClick={() => setViewMode('all')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-[0.85rem] font-medium transition-all ${
              viewMode === 'all'
                ? 'bg-white text-[#2b6de0] font-semibold shadow-sm'
                : 'text-[#8b92a8] hover:text-[#1a1d26]'
            }`}
          >
            <i className="fas fa-th-large" /> All Jobs
          </button>
          <button
            onClick={() => setViewMode('recommended')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-[0.85rem] font-medium transition-all ${
              viewMode === 'recommended'
                ? 'bg-white text-[#2b6de0] font-semibold shadow-sm'
                : 'text-[#8b92a8] hover:text-[#1a1d26]'
            }`}
          >
            <i className="fas fa-wand-magic-sparkles" /> Recommended
          </button>
          <button
            onClick={() => setViewMode('saved')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-[0.85rem] font-medium transition-all ${
              viewMode === 'saved'
                ? 'bg-white text-[#2b6de0] font-semibold shadow-sm'
                : 'text-[#8b92a8] hover:text-[#1a1d26]'
            }`}
          >
            <i className="fas fa-bookmark" /> Saved
            {savedTotal > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[0.72rem] font-bold bg-amber-100 text-amber-700">
                {savedTotal}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filter Card */}
      <div
        className="bg-white border border-[#eef0f4] rounded-[14px] px-6 py-5"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
      >
        {/* Main Filters Row */}
        <div className="flex flex-wrap gap-3 mb-0">
          {/* Search */}
          <div className="flex-1 min-w-[200px] relative">
            <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8b92a8] text-sm" />
            <input
              type="text"
              placeholder="Search by title, skill, or company..."
              className="w-full pl-10 pr-4 py-[9px] border border-[#e2e6ed] rounded-md text-sm text-[#1a1d26] outline-none focus:border-primary bg-white transition-colors placeholder:text-[#8b92a8]"
              style={{ fontFamily: 'inherit' }}
              value={filters.keyword ?? ''}
              onChange={(e) => setFilters(f => ({ ...f, keyword: e.target.value || undefined, page: 1 }))}
            />
          </div>

          {/* Job Type */}
          <select
            className="px-3 py-[9px] border border-[#e2e6ed] rounded-md text-sm text-[#1a1d26] outline-none focus:border-primary bg-white cursor-pointer"
            style={{ fontFamily: 'inherit', appearance: 'none', paddingRight: '34px',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%235f6780' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10l-5 5z'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
            value={filters.jobType ?? ''}
            onChange={(e) => setFilters(f => ({ ...f, jobType: e.target.value || undefined, page: 1 }))}
          >
            <option value="">All Types</option>
            {JOB_TYPES.map(t => (
              <option key={t} value={t}>{t.replace('FULLTIME','Full-time').replace('PARTTIME','Part-time').replace('REMOTE','Remote').replace('HYBRID','Hybrid')}</option>
            ))}
          </select>

          {/* Experience Level */}
          <select
            className="px-3 py-[9px] border border-[#e2e6ed] rounded-md text-sm text-[#1a1d26] outline-none focus:border-primary bg-white cursor-pointer"
            style={{ fontFamily: 'inherit', appearance: 'none', paddingRight: '34px',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%235f6780' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10l-5 5z'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
            value={filters.experienceLevels?.[0] ?? ''}
            onChange={(e) => setFilters(f => ({ ...f, experienceLevels: e.target.value ? [e.target.value] : undefined, page: 1 }))}
          >
            <option value="">All Levels</option>
            {EXP_LEVELS.map(l => <option key={l} value={l}>{l.charAt(0) + l.slice(1).toLowerCase()}</option>)}
          </select>

          {/* Location */}
          <input
            type="text"
            placeholder="Location..."
            className="px-3 py-[9px] border border-[#e2e6ed] rounded-md text-sm text-[#1a1d26] outline-none focus:border-primary bg-white w-44 placeholder:text-[#8b92a8]"
            style={{ fontFamily: 'inherit' }}
            value={filters.location ?? ''}
            onChange={(e) => setFilters(f => ({ ...f, location: e.target.value || undefined, page: 1 }))}
          />
        </div>

        {/* Resume Filter Row */}
        <div
          className="flex items-center gap-3 mt-3 pt-3 flex-wrap"
          style={{ borderTop: '1px solid #eef0f4' }}
        >
          <div className="flex items-center gap-2 text-sm font-medium text-[#5f6780] whitespace-nowrap">
            <i className="fas fa-file-pdf text-[#ef4444]" />
            <span>Filter by Resume</span>
          </div>
          <select
            className="flex-1 min-w-[200px] px-3 py-[9px] border border-[#e2e6ed] rounded-md text-sm text-[#1a1d26] outline-none focus:border-primary bg-white cursor-pointer"
            style={{ fontFamily: 'inherit', appearance: 'none', paddingRight: '34px',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%235f6780' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10l-5 5z'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
            defaultValue=""
          >
            <option value="">— No resume selected —</option>
          </select>
          <button
            onClick={() => navigate('/resumes')}
            className="flex items-center gap-1.5 px-3 py-[9px] text-sm text-[#5f6780] hover:bg-[#f4f6fa] hover:text-[#1a1d26] rounded-md transition-colors whitespace-nowrap"
          >
            <i className="fas fa-external-link-alt text-xs" /> Manage Resumes
          </button>
        </div>
      </div>

      {/* Recommended Section (shown when 'recommended' tab or always on top) */}
      {viewMode === 'recommended' && (
        <div
          className="rounded-[14px] p-6 border"
          style={{
            background: 'linear-gradient(135deg,rgba(139,92,246,0.03),rgba(66,135,245,0.03))',
            borderColor: 'rgba(139,92,246,0.18)',
          }}
        >
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div className="flex items-center gap-3.5">
              <div
                className="w-11 h-11 rounded-[10px] flex items-center justify-center text-white text-lg"
                style={{
                  background: 'linear-gradient(135deg,#8b5cf6,#4287f5)',
                  boxShadow: '0 4px 14px rgba(139,92,246,0.25)',
                }}
              >
                <i className="fas fa-wand-magic-sparkles" />
              </div>
              <div>
                <h3 className="text-[1.15rem] font-bold text-[#1a1d26]">Recommended For You</h3>
                <p className="text-sm text-[#8b92a8] mt-0.5">AI-matched jobs based on your resume and profile</p>
              </div>
            </div>
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: 'rgba(139,92,246,0.08)', color: '#6d28d9' }}
            >
              <i className="fas fa-robot" /> AI Powered
            </span>
          </div>

          <div className="text-center py-10 text-[#8b92a8]">
            <i className="fas fa-robot text-5xl mb-4 block opacity-20" />
            <p className="text-sm">Upload a resume to get AI-powered job recommendations</p>
            <button
              onClick={() => navigate('/resumes')}
              className="mt-4 px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-md hover:bg-[#2b6de0] transition-colors"
            >
              Upload Resume
            </button>
          </div>
        </div>
      )}

      {/* All Jobs Section */}
      {(viewMode === 'all') && (
        <>
          {/* Section divider */}
          <div
            className="flex items-center justify-between pb-3.5"
            style={{ borderBottom: '2px solid #eef0f4' }}
          >
            <h3 className="text-[1.05rem] font-semibold text-[#1a1d26] flex items-center gap-2.5">
              <i className="fas fa-briefcase text-primary" />
              All Job Listings
            </h3>
            {totalJobs > 0 && (
              <span
                className="px-3 py-1 rounded-full text-xs font-semibold"
                style={{ background: '#f1f3f7', color: '#5f6780' }}
              >
                {totalJobs} jobs
              </span>
            )}
          </div>

          {/* Grid */}
          {loading ? (
            <LoadingSpinner />
          ) : jobs.length === 0 ? (
            <EmptyState icon="fa-briefcase" title="No jobs found" description="Try adjusting your filters or search terms." />
          ) : (
            <>
              <div
                className="grid gap-5"
                style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}
              >
                {jobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onClick={() => navigate(`/jobs/${job.id}`)}
                    onToggleSave={handleToggleSave}
                    savePendingId={savePendingId}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-2">
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => setFilters(f => ({ ...f, page: i + 1 }))}
                      className={`w-9 h-9 rounded-md text-sm font-semibold transition-colors ${
                        filters.page === i + 1
                          ? 'bg-primary text-white'
                          : 'bg-white border border-[#e2e6ed] text-[#8b92a8] hover:bg-[#f4f6fa]'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
      {/* Saved Jobs Section */}
      {viewMode === 'saved' && (
        <>
          <div
            className="flex items-center justify-between pb-3.5"
            style={{ borderBottom: '2px solid #eef0f4' }}
          >
            <h3 className="text-[1.05rem] font-semibold text-[#1a1d26] flex items-center gap-2.5">
              <i className="fas fa-bookmark text-amber-500" />
              Saved Jobs
            </h3>
            {savedTotal > 0 && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: '#f1f3f7', color: '#5f6780' }}>
                {savedTotal} saved
              </span>
            )}
          </div>

          {savedLoading ? (
            <LoadingSpinner />
          ) : savedJobs.length === 0 ? (
            <EmptyState icon="fa-bookmark" title="No saved jobs" description="Save jobs you're interested in to review them later." />
          ) : (
            <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
              {savedJobs.map((saved) => (
                <article
                  key={saved.savedJobId}
                  onClick={() => navigate(`/jobs/${saved.jobId}`)}
                  className="bg-white border border-[#eef0f4] rounded-[14px] p-6 flex flex-col cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-[#6ea3f7] group"
                  style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)')}
                >
                  <div className="flex items-start gap-3.5 mb-4">
                    <div className="w-12 h-12 rounded-[10px] flex items-center justify-center font-bold text-lg shrink-0" style={{ background: 'rgba(66,135,245,0.08)', color: '#2b6de0' }}>
                      {saved.companyName?.charAt(0).toUpperCase() || saved.jobTitle.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[1.02rem] font-semibold text-[#1a1d26] leading-snug group-hover:text-primary transition-colors">{saved.jobTitle}</h3>
                      <div className="text-sm text-[#5f6780] mt-0.5">{saved.companyName}</div>
                    </div>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        setSavePendingId(saved.jobId);
                        try {
                          await jobService.unsaveJob(saved.jobId);
                          setSavedJobs(prev => prev.filter(s => s.jobId !== saved.jobId));
                          setSavedTotal(t => Math.max(0, t - 1));
                        } finally {
                          setSavePendingId(null);
                        }
                      }}
                      disabled={savePendingId === saved.jobId}
                      title="Unsave"
                      className="p-1.5 rounded-md text-amber-500 hover:text-amber-600 transition-colors disabled:opacity-40"
                    >
                      <i className="fas fa-bookmark text-base" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-3 text-[0.82rem] text-[#8b92a8] mb-3.5">
                    {saved.location && <span className="flex items-center gap-1.5"><i className="fas fa-map-marker-alt" /> {saved.location}</span>}
                    {saved.jobType && <span className="flex items-center gap-1.5"><i className="fas fa-clock" /> {saved.jobType.replace('FULLTIME', 'Full-time').replace('PARTTIME', 'Part-time')}</span>}
                  </div>
                  <div className="flex items-center justify-between mt-auto pt-4" style={{ borderTop: '1px solid #eef0f4' }}>
                    <span className="text-[0.95rem] font-semibold text-[#2b6de0]">
                      {saved.salaryMin && saved.salaryMax
                        ? `$${saved.salaryMin.toLocaleString()} – $${saved.salaryMax.toLocaleString()}`
                        : 'Negotiable'}
                    </span>
                    <span className="text-[0.75rem] text-[#8b92a8]">
                      Saved {new Date(saved.savedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
