import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { jobService } from '../../services/jobService';
import { resumeService } from '../../services/resumeService';
import { applicationService } from '../../services/applicationService';
import type { Job } from '../../types/job';
import type { Resume } from '../../types/resume';

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [selectedResume, setSelectedResume] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!id) return;
    Promise.all([
      jobService.getJobById(id),
      resumeService.listResumes(),
    ]).then(([j, r]) => {
      setJob(j);
      setResumes(r);
      const primary = r.find((res: Resume) => res.isPrimary);
      if (primary) setSelectedResume(primary.id);
      else if (r.length > 0) setSelectedResume(r[0].id);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleApply = async () => {
    if (!id || !selectedResume) return;
    setApplying(true);
    setErrorMsg('');
    try {
      await applicationService.apply({ jobId: id, resumeId: selectedResume, coverLetter: coverLetter || undefined });
      setSuccessMsg('Application submitted successfully!');
      setTimeout(() => navigate('/applications'), 1500);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to submit application');
    } finally {
      setApplying(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!job) return <div className="text-center py-16 text-text-muted">Job not found</div>;

  const formatSalary = (min: number | null, max: number | null) => {
    if (!min && !max) return 'Negotiable';
    if (min && max) return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
    if (min) return `From $${min.toLocaleString()}`;
    return `Up to $${max!.toLocaleString()}`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        {/* Left: Job Details */}
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-white rounded-2xl border border-border p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary text-2xl font-bold shrink-0">
                {job.companyName?.charAt(0) || job.title.charAt(0)}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-text mb-1">{job.title}</h1>
                <p className="text-text-muted text-[0.95rem]">
                  {job.companyName || 'Unknown Company'} — {job.location || 'Remote'}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4">
              <div className='rounded-xl bg-gray-200 p-4'>
                <div className="text-[0.75rem] font-bold text-text-muted uppercase tracking-wider mb-1">Salary Range</div>
                <div className="text-[0.95rem] font-bold text-primary">{formatSalary(job.salaryMin, job.salaryMax)}</div>
              </div>
              <div className='rounded-xl bg-gray-200 p-4'>
                <div className="text-[0.75rem] font-bold text-text-muted uppercase tracking-wider mb-1">Job Type</div>
                <div className="text-[0.95rem] font-semibold text-text">{job.jobType || 'Not specified'}</div>
              </div>
              <div className='rounded-xl bg-gray-200 p-4'>
                <div className="text-[0.75rem] font-bold text-text-muted uppercase tracking-wider mb-1">Experience</div>
                <div className="text-[0.95rem] font-semibold text-text">{job.experienceLevels?.join(', ') || 'Not specified'}</div>
              </div>
              <div className='rounded-xl bg-gray-200 p-4'>
                <div className="text-[0.75rem] font-bold text-text-muted uppercase tracking-wider mb-1">Posted</div>
                <div className="text-[0.95rem] font-semibold text-text">{new Date(job.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="bg-white rounded-2xl border border-border p-6">
            <h2 className="text-[1.1rem] font-bold text-text mb-4">Job Description</h2>
            <div className="text-[0.92rem] text-text-muted leading-relaxed whitespace-pre-line">
              {job.description || 'No description provided.'}
            </div>
          </div>

          {/* Required Skills */}
          {job.skills && job.skills.length > 0 && (
            <div className="bg-white rounded-2xl border border-border p-6">
              <h2 className="text-[1.1rem] font-bold text-text mb-4">Required Skills</h2>
              <div className="flex flex-wrap gap-2">
                {job.skills.map((skill) => (
                  <span key={skill.id} className="px-3 py-1.5 bg-primary/10 rounded-lg text-[0.85rem] font-semibold text-primary">
                    {skill.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Apply Form + Company */}
        <div className="space-y-6">
          {/* Apply Form */}
          <div className="bg-white rounded-2xl border border-border p-6">
            <h3 className="text-[1.1rem] font-bold text-text mb-5 flex items-center gap-2">
              <i className="fas fa-paper-plane text-primary"></i> Apply Now
            </h3>

            {successMsg ? (
              <div className="text-center py-6">
                <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <i className="fas fa-check text-emerald-500 text-xl"></i>
                </div>
                <p className="text-sm font-semibold text-emerald-700">{successMsg}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">Select Resume <span className="text-red-500">*</span></label>
                  <select
                    value={selectedResume}
                    onChange={(e) => setSelectedResume(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                  >
                    <option value="">Choose a resume...</option>
                    {resumes.map(r => (
                      <option key={r.id} value={r.id}>{r.label || 'Untitled Resume'} {r.isPrimary ? '(Primary)' : ''}</option>
                    ))}
                  </select>
                  <div className="mt-2 text-[0.8rem] text-text-muted">
                    Or <button onClick={() => navigate('/resumes')} className="text-primary font-medium hover:underline">upload a new resume</button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">Cover Letter</label>
                  <textarea
                    rows={5}
                    placeholder="Write a brief cover letter to introduce yourself..."
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 resize-none leading-relaxed"
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                  />
                </div>

                {errorMsg && (
                  <p className="text-sm text-red-500 font-medium">{errorMsg}</p>
                )}

                <button
                  onClick={handleApply}
                  disabled={applying || !selectedResume}
                  className="w-full py-3 bg-primary text-white rounded-xl text-[0.95rem] font-semibold hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  {applying ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Submitting...</>
                  ) : (
                    <><i className="fas fa-paper-plane"></i> Submit Application</>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Company Info */}
          <div className="bg-white rounded-2xl border border-border p-6">
            <h3 className="text-[1.1rem] font-bold text-text mb-4">About the Company</h3>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary text-xl font-bold shrink-0">
                {job.companyName?.charAt(0) || 'C'}
              </div>
              <div>
                <div className="font-bold text-text">{job.companyName || 'Unknown Company'}</div>
                <div className="text-[0.82rem] text-text-muted flex items-center gap-1">
                  Verified Company <i className="fas fa-check-circle text-primary"></i>
                </div>
              </div>
            </div>
            <p className="text-[0.88rem] text-text-muted leading-relaxed mb-4">
              {job.companyName || 'This company'} is a verified employer on JobSeeker platform. They are actively hiring for positions like {job.title}.
            </p>
            <div className="text-[0.85rem] text-text-muted space-y-2">
              <div className="flex items-center gap-2">
                <i className="fas fa-map-marker-alt w-4 text-center"></i> {job.location || 'Remote'}
              </div>
              <div className="flex items-center gap-2">
                <i className="fas fa-users w-4 text-center"></i> 50+ employees
              </div>
            </div>
          </div>
        </div>
    </div>
  );
}
