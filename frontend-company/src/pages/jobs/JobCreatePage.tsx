import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams, useOutletContext } from 'react-router-dom';
import Topbar from '../../components/layout/Topbar';
import { useJobDetail, useCreateJob, useUpdateJob, useSkills, useIndustries } from '../../hooks/useJobs';
import { useCompanyAddresses } from '../../hooks/useCompany';
import { useToast } from '../../contexts/ToastContext';
import { ROUTES } from '../../constants';
import type { ExperienceLevel, JobFormData } from '../../types/job';

const EXPERIENCE_LEVELS: { value: ExperienceLevel; label: string }[] = [
  { value: 'INTERN',  label: 'Intern'  },
  { value: 'FRESHER', label: 'Fresher' },
  { value: 'JUNIOR',  label: 'Junior'  },
  { value: 'MIDDLE',  label: 'Middle'  },
  { value: 'SENIOR',  label: 'Senior'  },
  { value: 'LEADER',  label: 'Leader'  },
];

type FormValues = Omit<JobFormData, 'levels' | 'skillIds' | 'responsibilities' | 'requirements' | 'niceToHaveSkills'>;

export default function JobCreatePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { onMenuToggle } = useOutletContext<{ onMenuToggle: () => void }>();
  const isEdit = !!id;
  const { data: job } = useJobDetail(id || '');
  const { data: addresses } = useCompanyAddresses();
  const { data: skills } = useSkills();
  const { data: industries } = useIndustries();
  const createJob = useCreateJob();
  const updateJob = useUpdateJob();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>();
  const [locationMode, setLocationMode] = useState<'saved' | 'custom'>(isEdit ? 'custom' : 'saved');
  const [selectedLevels, setSelectedLevels] = useState<ExperienceLevel[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [responsibilities, setResponsibilities] = useState<string[]>([]);
  const [responsibilityInput, setResponsibilityInput] = useState('');
  const [requirements, setRequirements] = useState<string[]>([]);
  const [requirementInput, setRequirementInput] = useState('');
  const [niceToHaveSkills, setNiceToHaveSkills] = useState<string[]>([]);
  const [niceToHaveSkillInput, setNiceToHaveSkillInput] = useState('');
  const toast = useToast();

  useEffect(() => {
    if (isEdit && job) {
      reset({
        title: job.title,
        description: job.description,
        industryId: job.industry?.id || '',
        jobType: job.jobType,
        location: job.location,
        salaryMin: job.salaryMin ?? undefined,
        salaryMax: job.salaryMax ?? undefined,
        status: job.status,
      });
      setSelectedLevels(job.experienceLevels || []);
      setSelectedSkills(job.skills?.map((s) => s.id) || []);
      setResponsibilities(job.responsibilities || []);
      setRequirements(job.requirements || []);
      setNiceToHaveSkills(job.niceToHaveSkills || []);
      // Always show manual mode when editing — saved location is a free-text string
      setLocationMode('custom');
    }
  }, [isEdit, job, reset]);

  const toggleLevel = (level: ExperienceLevel) => {
    setSelectedLevels((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]
    );
  };

  const handleAddSkill = (skillId: string) => {
    if (!selectedSkills.includes(skillId)) {
      setSelectedSkills([...selectedSkills, skillId]);
    }
    setSkillInput('');
  };

  const handleRemoveSkill = (skillId: string) => {
    setSelectedSkills(selectedSkills.filter((s) => s !== skillId));
  };

  const onSubmit = async (data: FormValues) => {
    if (selectedLevels.length === 0) {
      toast.error('Please select at least one experience level.');
      return;
    }
    
    try {
      const payload: JobFormData = {
        ...data,
        levels: selectedLevels,
        skillIds: selectedSkills,
        responsibilities,
        requirements,
        niceToHaveSkills,
      };
      if (isEdit) {
        await updateJob.mutateAsync({ id: id!, data: payload });
        toast.success('Job updated successfully!');
      } else {
        await createJob.mutateAsync(payload);
        toast.success('Job created successfully!');
      }
      navigate(ROUTES.JOBS);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || 'Failed to save job.';
      toast.error(msg);
    }
  };

  const filteredSkills =
    skills?.filter(
      (s) => s.name.toLowerCase().includes(skillInput.toLowerCase()) && !selectedSkills.includes(s.id)
    ) || [];

  return (
    <>
      <Topbar
        title={isEdit ? 'Edit Job' : 'Create New Job'}
        breadcrumbs={[{ label: 'Jobs', to: ROUTES.JOBS }, { label: isEdit ? 'Edit' : 'Create New Job' }]}
        onMenuToggle={onMenuToggle}
      />
      <div className="p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-50 max-w-[860px] mx-auto">
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">

            {/* Title */}
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Job Title <span className="text-red-500">*</span>
              </label>
              <input
                className={`w-full px-3.5 py-2.5 border-[1.5px] rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/10 ${errors.title ? 'border-red-500' : 'border-gray-200'}`}
                placeholder="e.g. Senior Frontend Developer"
                {...register('title', { required: 'Title is required' })}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                className="w-full px-3.5 py-2.5 border-[1.5px] border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/10 min-h-[160px]"
                placeholder="Describe the role, responsibilities, requirements..."
                {...register('description', { required: true })}
              />
            </div>

            {/* Industry */}
            <div>
              <label className="block text-sm font-medium mb-1.5">Industry</label>
              <select
                className="w-full px-3.5 py-2.5 border-[1.5px] border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/10"
                {...register('industryId')}
              >
                <option value="">Select an industry...</option>
                {industries?.map((ind) => (
                  <option key={ind.id} value={ind.id}>{ind.name}</option>
                ))}
              </select>
            </div>

            {/* Responsibilities */}
            <div>
              <label className="block text-sm font-medium mb-1.5">Responsibilities</label>
              <div className="flex gap-2">
                <input
                  className="flex-1 px-3.5 py-2.5 border-[1.5px] border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/10"
                  placeholder="Type a responsibility and press Enter..."
                  value={responsibilityInput}
                  onChange={(e) => setResponsibilityInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const trimmed = responsibilityInput.trim();
                      if (trimmed && !responsibilities.includes(trimmed)) {
                        setResponsibilities([...responsibilities, trimmed]);
                      }
                      setResponsibilityInput('');
                    }
                  }}
                />
                <button
                  type="button"
                  className="px-3.5 py-2.5 bg-primary/10 text-primary rounded-xl text-sm font-medium hover:bg-primary/20 transition-colors"
                  onClick={() => {
                    const trimmed = responsibilityInput.trim();
                    if (trimmed && !responsibilities.includes(trimmed)) {
                      setResponsibilities([...responsibilities, trimmed]);
                    }
                    setResponsibilityInput('');
                  }}
                >
                  <i className="fas fa-plus" />
                </button>
              </div>
              {responsibilities.length > 0 && (
                <ul className="mt-2 space-y-1.5">
                  {responsibilities.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 bg-gray-50 rounded-lg px-3 py-2 text-sm">
                      <span className="text-primary mt-0.5">•</span>
                      <span className="flex-1">{item}</span>
                      <button
                        type="button"
                        className="text-gray-400 hover:text-red-500 transition-colors ml-1 shrink-0"
                        onClick={() => setResponsibilities(responsibilities.filter((_, i) => i !== idx))}
                      >
                        <i className="fas fa-times text-xs" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Requirements */}
            <div>
              <label className="block text-sm font-medium mb-1.5">Requirements</label>
              <div className="flex gap-2">
                <input
                  className="flex-1 px-3.5 py-2.5 border-[1.5px] border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/10"
                  placeholder="Type a requirement and press Enter..."
                  value={requirementInput}
                  onChange={(e) => setRequirementInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const trimmed = requirementInput.trim();
                      if (trimmed && !requirements.includes(trimmed)) {
                        setRequirements([...requirements, trimmed]);
                      }
                      setRequirementInput('');
                    }
                  }}
                />
                <button
                  type="button"
                  className="px-3.5 py-2.5 bg-primary/10 text-primary rounded-xl text-sm font-medium hover:bg-primary/20 transition-colors"
                  onClick={() => {
                    const trimmed = requirementInput.trim();
                    if (trimmed && !requirements.includes(trimmed)) {
                      setRequirements([...requirements, trimmed]);
                    }
                    setRequirementInput('');
                  }}
                >
                  <i className="fas fa-plus" />
                </button>
              </div>
              {requirements.length > 0 && (
                <ul className="mt-2 space-y-1.5">
                  {requirements.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 bg-gray-50 rounded-lg px-3 py-2 text-sm">
                      <span className="text-primary mt-0.5">•</span>
                      <span className="flex-1">{item}</span>
                      <button
                        type="button"
                        className="text-gray-400 hover:text-red-500 transition-colors ml-1 shrink-0"
                        onClick={() => setRequirements(requirements.filter((_, i) => i !== idx))}
                      >
                        <i className="fas fa-times text-xs" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Experience Levels (multi-select pills) */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Experience Level <span className="text-red-500">*</span>
                <span className="text-gray-400 font-normal ml-1">(select all that apply)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {EXPERIENCE_LEVELS.map(({ value, label }) => {
                  const active = selectedLevels.includes(value);
                  return (
                    <button
                      key={value}
                      type="button"
                      id={`level-${value}`}
                      onClick={() => toggleLevel(value)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium border-[1.5px] transition-all duration-150 select-none ${
                        active
                          ? 'bg-primary/10 border-primary text-primary'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-primary/50 hover:text-primary'
                      }`}
                    >
                      {active && <i className="fas fa-check mr-1.5 text-xs" />}
                      {label}
                    </button>
                  );
                })}
              </div>
              {selectedLevels.length === 0 && (
                <p className="text-xs text-gray-400 mt-1.5">
                  <i className="fas fa-info-circle mr-1" />
                  Click to select one or more levels
                </p>
              )}
            </div>

            {/* Job Type */}
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Job Type <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full px-3.5 py-2.5 border-[1.5px] border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary"
                {...register('jobType', { required: true })}
              >
                <option value="">Select type</option>
                {[
                  ['FULLTIME', 'Full-time'],
                  ['PARTTIME', 'Part-time'],
                  ['REMOTE', 'Remote'],
                  ['HYBRID', 'Hybrid'],
                ].map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>

            {/* Location Tabs */}
            <div>
              <label className="block text-sm font-medium mb-1.5">
                <i className="fas fa-map-marker-alt text-primary mr-1" />
                Location <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${locationMode === 'saved' ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  onClick={() => setLocationMode('saved')}
                >
                  <i className="fas fa-building" /> Company Locations
                </button>
                <button
                  type="button"
                  className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${locationMode === 'custom' ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  onClick={() => setLocationMode('custom')}
                >
                  <i className="fas fa-pen" /> Enter Manually
                </button>
              </div>
              {locationMode === 'saved' ? (
                <select
                  className="w-full px-3.5 py-2.5 border-[1.5px] border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary"
                  {...register('location', { required: true })}
                >
                  <option value="">Choose a saved location...</option>
                  {addresses?.map((addr) => (
                    <option key={addr.id} value={`${addr.city}, ${addr.country}`}>
                      🏢 {addr.label} — {addr.addressLine}, {addr.city}
                      {addr.isDefault ? ' (Default)' : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <>
                  <input
                    className="w-full px-3.5 py-2.5 border-[1.5px] border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/10"
                    placeholder="e.g. Ho Chi Minh City, Vietnam"
                    {...register('location', { required: true })}
                  />
                  <div className="text-xs text-gray-400 mt-1">
                    <i className="fas fa-info-circle mr-1" />
                    Enter a custom location. This won't be saved to your company addresses.
                  </div>
                </>
              )}
            </div>

            {/* Salary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Minimum Salary (USD)</label>
                <input
                  type="number"
                  className="w-full px-3.5 py-2.5 border-[1.5px] border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/10"
                  placeholder="e.g. 1000"
                  {...register('salaryMin', { valueAsNumber: true })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Maximum Salary (USD)</label>
                <input
                  type="number"
                  className="w-full px-3.5 py-2.5 border-[1.5px] border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/10"
                  placeholder="e.g. 3000"
                  {...register('salaryMax', { valueAsNumber: true })}
                />
              </div>
            </div>

            {/* Skills */}
            <div>
              <label className="block text-sm font-medium mb-1.5">Must-have Skills</label>
              <div className="relative">
                <input
                  className="w-full px-3.5 py-2.5 border-[1.5px] border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/10"
                  placeholder="Type to search skills..."
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                />
                {skillInput && filteredSkills.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl mt-1 shadow-lg z-10 max-h-40 overflow-y-auto">
                    {filteredSkills.slice(0, 10).map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                        onClick={() => handleAddSkill(s.id)}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedSkills.map((sid) => {
                  const skill = skills?.find((s) => s.id === sid);
                  return skill ? (
                    <span
                      key={sid}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-medium"
                    >
                      {skill.name}
                      <button
                        type="button"
                        className="hover:text-red-500"
                        onClick={() => handleRemoveSkill(sid)}
                      >
                        &times;
                      </button>
                    </span>
                  ) : null;
                })}
              </div>
            </div>

            {/* Nice-to-have Skills */}
            <div>
              <label className="block text-sm font-medium mb-1.5">Nice-to-have Skills</label>
              <div className="flex gap-2">
                <input
                  className="flex-1 px-3.5 py-2.5 border-[1.5px] border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/10"
                  placeholder="Type a skill and press Enter..."
                  value={niceToHaveSkillInput}
                  onChange={(e) => setNiceToHaveSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const trimmed = niceToHaveSkillInput.trim();
                      if (trimmed && !niceToHaveSkills.includes(trimmed)) {
                        setNiceToHaveSkills([...niceToHaveSkills, trimmed]);
                      }
                      setNiceToHaveSkillInput('');
                    }
                  }}
                />
                <button
                  type="button"
                  className="px-3.5 py-2.5 bg-primary/10 text-primary rounded-xl text-sm font-medium hover:bg-primary/20 transition-colors"
                  onClick={() => {
                    const trimmed = niceToHaveSkillInput.trim();
                    if (trimmed && !niceToHaveSkills.includes(trimmed)) {
                      setNiceToHaveSkills([...niceToHaveSkills, trimmed]);
                    }
                    setNiceToHaveSkillInput('');
                  }}
                >
                  <i className="fas fa-plus" />
                </button>
              </div>
              {niceToHaveSkills.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {niceToHaveSkills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-xs font-medium"
                    >
                      {skill}
                      <button
                        type="button"
                        className="hover:text-red-500"
                        onClick={() => setNiceToHaveSkills(niceToHaveSkills.filter((_, i) => i !== idx))}
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="text-xs text-gray-400 mt-1.5">
                <i className="fas fa-info-circle mr-1" />
                Candidates with these skills are a bonus but not required.
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium mb-1.5">Status</label>
              <select
                className="w-full px-3.5 py-2.5 border-[1.5px] border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary"
                {...register('status')}
              >
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 flex items-center gap-2"
                onClick={() => navigate(ROUTES.JOBS)}
              >
                <i className="fas fa-arrow-left" /> Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-hover transition-colors flex items-center gap-2 disabled:opacity-60"
                disabled={createJob.isPending || updateJob.isPending}
              >
                <i className={`fas ${isEdit ? 'fa-save' : 'fa-paper-plane'}`} />
                {isEdit ? 'Save Changes' : 'Publish Job'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
