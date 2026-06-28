import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams, useOutletContext } from 'react-router-dom';
import Topbar from '../../components/layout/Topbar';
import { useJobDetail, useCreateJob, useUpdateJob, useSkills, useIndustries, useAutoFillJobFromFile } from '../../hooks/useJobs';
import { useCompanyAddresses } from '../../hooks/useCompany';
import { useCurrentSubscription } from '../../hooks/useSubscription';
import { skillService } from '../../services/jobService';
import { useToast } from '../../contexts/ToastContext';
import { ROUTES } from '../../constants';
import type { ExperienceLevel, JobFormData, Skill } from '../../types/job';
import PageHeader from '../../components/common/PageHeader';

const EXPERIENCE_LEVELS: { value: ExperienceLevel; label: string }[] = [
  { value: 'INTERN',  label: 'Intern'  },
  { value: 'FRESHER', label: 'Fresher' },
  { value: 'JUNIOR',  label: 'Junior'  },
  { value: 'MIDDLE',  label: 'Middle'  },
  { value: 'SENIOR',  label: 'Senior'  },
  { value: 'LEADER',  label: 'Leader'  },
];

type FormValues = Omit<JobFormData, 'levels' | 'skillIds' | 'responsibilities' | 'requirements' | 'niceToHaveSkills'>;

const normalizeSkillName = (value: string) =>
  value
    .toLowerCase()
    .replace(/\bapis\b/g, 'api')
    .replace(/\bjs\b/g, 'javascript')
    .replace(/[^a-z0-9]+/g, '');

const buildSkillLookup = (availableSkills: Skill[]) => {
  const lookup = new Map<string, Skill>();

  for (const skill of availableSkills) {
    lookup.set(normalizeSkillName(skill.name), skill);
  }

  return lookup;
};

const findSkillByName = (lookup: Map<string, Skill>, name: string) =>
  lookup.get(normalizeSkillName(name));

const todayDateInputValue = () => {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
};

const isJobClosed = (job?: { status?: string; closeDate?: string | null }) => {
  if (!job) return false;
  if (job.status === 'CLOSED') return true;
  return !!job.closeDate && job.closeDate < todayDateInputValue();
};

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
  const autoFillFromFile = useAutoFillJobFromFile();
  const { data: subscription, isLoading: isSubscriptionLoading } = useCurrentSubscription();
  const queryClient = useQueryClient();
  const toast = useToast();
  const closedJob = isEdit && isJobClosed(job);
  const hasApplicants = isEdit && (job?.applicationCount ?? 0) > 0;

  // Compute auto-fill eligibility (independent of allowUseAiMatching — that's for CV ranking)
  const autoFillLimit = subscription?.autoFillLimit ?? 0;
  const autoFillUsed = subscription?.autoFillUsageCount ?? 0;
  const autoFillRemaining = autoFillLimit - autoFillUsed;
  const canUseAutoFill = autoFillLimit > 0 && autoFillRemaining > 0;
  const autoFillDepleted = autoFillLimit > 0 && autoFillRemaining <= 0;
  const autoFillLocked = !canUseAutoFill; // true when disabled: not in plan OR exhausted
  const showAutoFillControls = !isEdit && !isSubscriptionLoading;

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormValues>();
  const [locationMode, setLocationMode] = useState<'saved' | 'custom'>(isEdit ? 'custom' : 'saved');
  const [selectedLevels, setSelectedLevels] = useState<ExperienceLevel[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [responsibilities, setResponsibilities] = useState<string[]>([]);
  const [responsibilityInput, setResponsibilityInput] = useState('');
  const [requirements, setRequirements] = useState<string[]>([]);
  const [requirementInput, setRequirementInput] = useState('');
  const [niceToHaveSkills, setNiceToHaveSkills] = useState<string[]>([]);
  const niceToHaveSkillsRef = useRef<string[]>([]);
  const [niceToHaveSkillInput, setNiceToHaveSkillInput] = useState('');
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);

  // Keep ref in sync whenever state changes
  useEffect(() => {
    niceToHaveSkillsRef.current = niceToHaveSkills;
  }, [niceToHaveSkills]);

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
        closeDate: job.closeDate ?? undefined,
        addressId: job.companyAddressId || '',
      });
      setSelectedLevels(job.experienceLevels || []);
      setSelectedSkills(job.skills?.map((s) => s.id) || []);
      setResponsibilities(job.responsibilities || []);
      setRequirements(job.requirements || []);
      setNiceToHaveSkills(job.niceToHaveSkills || []);
      setLocationMode(job.companyAddressId ? 'saved' : 'custom');
      if (job.attachmentUrl) setAttachmentPreview(job.attachmentUrl);
    }
  }, [isEdit, job, reset]);

  // Auto-select the primary (default) address when creating a new job
  // and the user hasn't picked one yet.
  const currentAddressId = watch('addressId');
  useEffect(() => {
    if (isEdit) return;
    if (!addresses || addresses.length === 0) return;
    if (locationMode !== 'saved') return;
    if (currentAddressId) return;
    const defaultAddress = addresses.find((a) => a.isDefault);
    if (!defaultAddress) return;
    setValue('addressId', defaultAddress.id, { shouldDirty: false, shouldValidate: false });
  }, [addresses, isEdit, locationMode, currentAddressId, setValue]);

  const toggleLevel = (level: ExperienceLevel) => {
    setSelectedLevels((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]
    );
  };

  const handleAddSkill = (skillId: string) => {
    setSelectedSkills((prev) => (prev.includes(skillId) ? prev : [...prev, skillId]));
    setSkillInput('');
  };

  const handleRemoveSkill = (skillId: string) => {
    setSelectedSkills(selectedSkills.filter((s) => s !== skillId));
  };

  const onSubmit = async (data: FormValues) => {
    if (closedJob || hasApplicants) {
      toast.error(closedJob ? 'Closed jobs cannot be updated.' : 'Jobs with applicants cannot be updated.');
      return;
    }

    if (selectedLevels.length === 0) {
      toast.error('Please select at least one experience level.');
      return;
    }

    if (locationMode === 'saved' && !data.addressId) {
      toast.error('Please choose a saved company location.');
      return;
    }

    if (locationMode === 'custom' && !data.location?.trim()) {
      toast.error('Please enter a job location.');
      return;
    }

    try {
      const payload: JobFormData = {
        ...data,
        closeDate: data.closeDate || undefined,
        location: locationMode === 'custom' ? data.location.trim() : '',
        addressId: locationMode === 'saved' ? data.addressId : '',
        levels: selectedLevels,
        skillIds: selectedSkills,
        responsibilities,
        requirements,
        niceToHaveSkills,
      };
      if (isEdit) {
        await updateJob.mutateAsync({ id: id!, data: payload, attachmentFile: attachmentFile ?? undefined });
        toast.success('Job updated successfully!');
      } else {
        await createJob.mutateAsync({ data: payload, attachmentFile: attachmentFile ?? undefined });
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

  const addResponsibility = () => {
    const trimmed = responsibilityInput.trim();
    if (trimmed && !responsibilities.includes(trimmed)) {
      setResponsibilities([...responsibilities, trimmed]);
    }
    setResponsibilityInput('');
  };

  const addRequirement = () => {
    const trimmed = requirementInput.trim();
    if (trimmed && !requirements.includes(trimmed)) {
      setRequirements([...requirements, trimmed]);
    }
    setRequirementInput('');
  };

  const addNiceToHave = () => {
    const trimmed = niceToHaveSkillInput.trim();
    if (trimmed && !niceToHaveSkillsRef.current.map((s) => s.toLowerCase()).includes(trimmed.toLowerCase())) {
      setNiceToHaveSkills([...niceToHaveSkillsRef.current, trimmed]);
    }
    setNiceToHaveSkillInput('');
  };

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a PDF, PNG, or JPG file.');
      e.target.value = '';
      return;
    }
    setAttachmentFile(file);
    setAttachmentPreview(URL.createObjectURL(file));
    e.target.value = '';
  };

  const handleRemoveAttachment = () => {
    setAttachmentFile(null);
    setAttachmentPreview(null);
  };

  const isImageFile = (url: string) => /\.(jpeg|jpg|png)$/i.test(url);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a PDF, PNG, or JPG file.');
      return;
    }

    try {
      const { data: response } = await autoFillFromFile.mutateAsync(file);
      const raw = response?.data as any;

      if (!raw) {
        toast.error('Could not extract job information from this file. Please fill in manually.');
        return;
      }

      // Normalize snake_case BE response → camelCase for FE mapping
      const result = {
        jobTitle: raw.job_title,
        description: raw.description,
        jobType: raw.job_type,
        experienceLevels: raw.experience_levels,
        location: raw.location,
        salaryMin: raw.salary_min,
        salaryMax: raw.salary_max,
        industry: raw.industry,
        responsibilities: raw.responsibilities,
        requirements: raw.requirements,
        mustHaveSkills: raw.must_have_skills,
        niceToHaveSkills: raw.nice_to_have_skills,
      };

      // Collect all form values into one object and call reset once
      const formValues: Record<string, string | number | undefined> = {};
      if (result.jobTitle) formValues.title = result.jobTitle;
      if (result.description) formValues.description = result.description;
      if (result.jobType) formValues.jobType = result.jobType;
      if (result.location) formValues.location = result.location;
      if (result.salaryMin !== undefined) formValues.salaryMin = result.salaryMin;
      if (result.salaryMax !== undefined) formValues.salaryMax = result.salaryMax;
      if (result.industry) {
        const matched = industries?.find(
          (ind) => ind.name.toLowerCase() === result.industry!.toLowerCase()
        );
        if (matched) formValues.industryId = matched.id;
      }
      reset(formValues);

      if (result.experienceLevels?.length) {
        const validLevels = result.experienceLevels.filter(
          (level: string): level is ExperienceLevel =>
            EXPERIENCE_LEVELS.some((option) => option.value === level)
        );
        setSelectedLevels(validLevels);
      }

      if (result.responsibilities?.length) setResponsibilities(result.responsibilities);
      if (result.requirements?.length) setRequirements(result.requirements);

      const availableSkills =
        skills ??
        (await queryClient.fetchQuery({
          queryKey: ['skills'],
          queryFn: async () => {
            const { data } = await skillService.getSkills();
            return data.data ?? [];
          },
          staleTime: 10 * 60 * 1000,
        })) ??
        [];

      const skillLookup = buildSkillLookup(availableSkills);

      // Apply must-have skills: map skill NAMES -> known IDs when possible
      const mustHave = result.mustHaveSkills ?? [];
      const niceFromApi = result.niceToHaveSkills ?? [];

      const matchedSkillIds: string[] = [];
      const matchedSkillNames = new Set<string>();
      const unmatchedSkillNames: string[] = [];

      for (const name of mustHave) {
        const matched = findSkillByName(skillLookup, name);
        if (matched) {
          matchedSkillIds.push(matched.id);
          matchedSkillNames.add(normalizeSkillName(matched.name));
          matchedSkillNames.add(normalizeSkillName(name));
        } else {
          unmatchedSkillNames.push(name);
        }
      }

      if (matchedSkillIds.length) {
        setSelectedSkills((prev) => {
          const set = new Set(prev);
          for (const id of matchedSkillIds) set.add(id);
          return [...set];
        });
      }

      // Nice-to-have is free text; also fallback truly unmatched must-have skills here.
      const combinedNiceNames = [...niceFromApi, ...unmatchedSkillNames].filter(
        (name) => !matchedSkillNames.has(normalizeSkillName(name))
      );
      if (combinedNiceNames.length) {
        setNiceToHaveSkills((prev) => {
          const existing = new Set(prev.map((s) => s.toLowerCase()));
          const next = [...prev];
          for (const n of combinedNiceNames) {
            const key = n.toLowerCase();
            if (!existing.has(key)) {
              existing.add(key);
              next.push(n);
            }
          }
          return next;
        });
      }

      toast.success('Job details auto-filled from file!');

      // Invalidate subscription cache so remaining auto-fill count updates immediately
      queryClient.invalidateQueries({ queryKey: ['company', 'subscription', 'current'] });
    } catch (err: unknown) {
      const errMsg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message;
      if (errMsg?.toLowerCase().includes('limit') || errMsg?.toLowerCase().includes('auto-fill')) {
        toast.error(errMsg || 'Auto-fill usage limit reached. Please upgrade your plan.');
      } else {
        toast.error('Failed to process file. Please fill in manually.');
      }
    }

    e.target.value = '';
  };

  return (
    <>
      <Topbar
        title={isEdit ? 'Edit Job' : 'Create New Job'}
        breadcrumbs={[{ label: 'Jobs', to: ROUTES.JOBS }, { label: isEdit ? 'Edit' : 'Create New Job' }]}
        onMenuToggle={onMenuToggle}
      />
      <div className="p-6 lg:p-8 max-w-full mx-32">
        <PageHeader
          title={isEdit ? 'Edit Job' : 'Create New Job'}
        />

        {closedJob && (
          <div className="mb-5 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
            <i className="fas fa-lock mr-2 text-gray-400" />
            This job is closed. You can view its details, but updates are disabled.
          </div>
        )}

        {hasApplicants && (
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            <i className="fas fa-users mr-2 text-amber-500" />
            This job already has applicants. You can view its details, but updates are disabled.
          </div>
        )}

        {/* Auto-fill upgrade banner — shown only when plan has no auto-fill at all */}
        {showAutoFillControls && autoFillLimit === 0 && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
              <i className="fas fa-lock text-amber-500 text-sm" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">AI Auto-fill is not included in your plan</p>
              <p className="text-xs text-amber-600 mt-0.5">
                Upgrade to a plan that includes AI auto-fill to quickly generate job descriptions from files.
              </p>
            </div>
            <a
              href="/subscriptions"
              className="shrink-0 px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-1.5"
            >
              <i className="fas fa-arrow-up text-[10px]" />
              Upgrade
            </a>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

          {/* ── Basic Information ─────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 lg:p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-5 bg-primary rounded-full" />
                <h3 className="text-base font-bold text-gray-900">Basic Information</h3>
              </div>
              <div className="flex items-center gap-3">
                {/* Auto-fill usage badge */}
                {showAutoFillControls && autoFillLimit > 0 && (
                  <div className="flex items-center gap-1.5 text-xs">
                    {autoFillRemaining > 0 ? (
                      <span className="flex items-center gap-1 text-gray-400">
                        <i className="fas fa-wand-magic-sparkles text-gray-400" />
                        <span className="font-medium">
                          {autoFillRemaining} / {autoFillLimit} left
                        </span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-400">
                        <i className="fas fa-ban text-red-400" />
                        <span className="font-medium">Limit Reached</span>
                      </span>
                    )}
                  </div>
                )}
                {showAutoFillControls && (
                  <label
                    className={`
                      group relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer
                      transition-all duration-300 select-none
                      ${!canUseAutoFill || autoFillDepleted
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : autoFillFromFile.isPending
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-primary to-indigo-500 text-white shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5'
                      }
                    `}
                  >
                    {autoFillFromFile.isPending ? (
                      <>
                        <span className="w-4 h-4 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : autoFillDepleted ? (
                      <>
                        <i className="fas fa-ban text-xs" />
                        <span>Limit Reached</span>
                      </>
                    ) : autoFillLocked ? (
                      <>
                        <i className="fas fa-lock text-xs" />
                        <span>Auto-fill Locked</span>
                      </>
                    ) : (
                      <>
                        <i className="fas fa-wand-magic-sparkles text-xs" />
                        <span>Auto-fill with AI</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept=".pdf,image/png,image/jpeg,image/jpg"
                      className="sr-only"
                      onChange={handleFileUpload}
                      disabled={autoFillFromFile.isPending || autoFillLocked}
                    />
                    {!autoFillLocked && !autoFillFromFile.isPending && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-yellow-400 rounded-full animate-pulse shadow-sm" />
                    )}
                  </label>
                )}
              </div>
            </div>

            <div className="space-y-5">
              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Job Title <span className="text-red-500">*</span>
                </label>
                <input
                  className={`w-full px-4 py-2.5 border-[1.5px] rounded-xl text-sm focus:outline-none transition-all ${
                    errors.title
                      ? 'border-red-400 focus:border-red-400 focus:ring-2 focus:ring-red-100'
                      : 'border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/10'
                  }`}
                  placeholder="e.g. Senior Frontend Developer"
                  {...register('title', { required: 'Title is required' })}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  className="w-full px-4 py-2.5 border-[1.5px] border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 min-h-[140px] resize-y transition-all"
                  placeholder="Describe the role, responsibilities, and what makes this opportunity unique..."
                  {...register('description', { required: true })}
                />
              </div>

              {/* Industry */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Industry</label>
                <select
                  className="w-full px-4 py-2.5 border-[1.5px] border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all bg-white"
                  {...register('industryId')}
                >
                  <option value="">Select an industry...</option>
                  {industries?.map((ind) => (
                    <option key={ind.id} value={ind.id}>{ind.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ── Job Details ───────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 lg:p-8">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-1.5 h-5 bg-primary rounded-full" />
              <h3 className="text-base font-bold text-gray-900">Job Details</h3>
            </div>

            <div className="space-y-5">
              {/* Experience Levels */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
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
                        onClick={() => toggleLevel(value)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium border-[1.5px] transition-all duration-150 select-none ${
                          active
                            ? 'bg-primary/10 border-primary text-primary shadow-sm'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-primary/40 hover:text-primary'
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
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Job Type <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full px-4 py-2.5 border-[1.5px] border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all bg-white"
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

              {/* Location */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <i className="fas fa-map-marker-alt text-primary mr-1" />
                  Location <span className="text-red-500">*</span>
                </label>

                {/* Location mode tabs */}
                <div className="tab-segmented mb-3">
                  <button
                    type="button"
                    className={locationMode === 'saved' ? 'active' : ''}
                    onClick={() => setLocationMode('saved')}
                  >
                    <i className="fas fa-building mr-1.5" />
                    Company Locations
                  </button>
                  <button
                    type="button"
                    className={locationMode === 'custom' ? 'active' : ''}
                    onClick={() => setLocationMode('custom')}
                  >
                    <i className="fas fa-pen mr-1.5" />
                    Enter Manually
                  </button>
                </div>

                {locationMode === 'saved' ? (
                  <select
                    className="w-full px-4 py-2.5 border-[1.5px] border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all bg-white"
                    {...register('addressId')}
                  >
                    <option value="">Choose a saved location...</option>
                    {addresses?.map((addr) => (
                      <option key={addr.id} value={addr.id}>
                        {addr.label} — {addr.addressLine}, {addr.city}
                        {addr.isDefault ? ' (Default)' : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="space-y-1.5">
                    <input
                      className="w-full px-4 py-2.5 border-[1.5px] border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                      placeholder="e.g. Ho Chi Minh City, Vietnam"
                      {...register('location', { required: true })}
                    />
                    <p className="text-xs text-gray-400">
                      <i className="fas fa-info-circle mr-1" />
                      Enter a custom location. This won't be saved to your company addresses.
                    </p>
                  </div>
                )}
              </div>

              {/* Salary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Minimum Salary (USD)</label>
                  <input
                    type="number"
                    className="w-full px-4 py-2.5 border-[1.5px] border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                    placeholder="e.g. 1000"
                    {...register('salaryMin', { valueAsNumber: true })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Maximum Salary (USD)</label>
                  <input
                    type="number"
                    className="w-full px-4 py-2.5 border-[1.5px] border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                    placeholder="e.g. 3000"
                    {...register('salaryMax', { valueAsNumber: true })}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Role Content ─────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 lg:p-8">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-1.5 h-5 bg-primary rounded-full" />
              <h3 className="text-base font-bold text-gray-900">Role Content</h3>
            </div>

            <div className="space-y-6">
              {/* Responsibilities */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Responsibilities</label>
                <div className="flex gap-2">
                  <input
                    className="flex-1 px-4 py-2.5 border-[1.5px] border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                    placeholder="Type a responsibility and press Enter..."
                    value={responsibilityInput}
                    onChange={(e) => setResponsibilityInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); addResponsibility(); }
                    }}
                  />
                  <button
                    type="button"
                    className="px-4 py-2.5 bg-primary/10 text-primary rounded-xl text-sm font-medium hover:bg-primary/20 transition-colors shrink-0"
                    onClick={addResponsibility}
                  >
                    <i className="fas fa-plus" />
                  </button>
                </div>
                {responsibilities.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {responsibilities.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-3 bg-gray-50 rounded-xl px-4 py-3 text-sm group">
                        <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                          {idx + 1}
                        </div>
                        <span className="flex-1 text-gray-700 leading-relaxed">{item}</span>
                        <button
                          type="button"
                          className="text-gray-300 hover:text-red-500 transition-colors shrink-0 opacity-0 group-hover:opacity-100"
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
                <label className="block text-sm font-semibold text-gray-700 mb-2">Requirements</label>
                <div className="flex gap-2">
                  <input
                    className="flex-1 px-4 py-2.5 border-[1.5px] border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                    placeholder="Type a requirement and press Enter..."
                    value={requirementInput}
                    onChange={(e) => setRequirementInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); addRequirement(); }
                    }}
                  />
                  <button
                    type="button"
                    className="px-4 py-2.5 bg-primary/10 text-primary rounded-xl text-sm font-medium hover:bg-primary/20 transition-colors shrink-0"
                    onClick={addRequirement}
                  >
                    <i className="fas fa-plus" />
                  </button>
                </div>
                {requirements.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {requirements.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-3 bg-gray-50 rounded-xl px-4 py-3 text-sm group">
                        <i className="fas fa-check-circle text-primary mt-0.5 shrink-0 text-xs" />
                        <span className="flex-1 text-gray-700 leading-relaxed">{item}</span>
                        <button
                          type="button"
                          className="text-gray-300 hover:text-red-500 transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                          onClick={() => setRequirements(requirements.filter((_, i) => i !== idx))}
                        >
                          <i className="fas fa-times text-xs" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* ── Skills ────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 lg:p-8">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-1.5 h-5 bg-primary rounded-full" />
              <h3 className="text-base font-bold text-gray-900">Skills</h3>
            </div>

            <div className="space-y-5">
              {/* Must-have Skills */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Must-have Skills</label>
                <div className="relative">
                  <input
                    className="w-full px-4 py-2.5 border-[1.5px] border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                    placeholder="Type to search skills..."
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                  />
                  {skillInput && filteredSkills.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl mt-1 shadow-dropdown z-10 max-h-44 overflow-y-auto">
                      {filteredSkills.slice(0, 10).map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
                          onClick={() => handleAddSkill(s.id)}
                        >
                          <i className="fas fa-plus text-primary text-[10px]" />
                          {s.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {selectedSkills.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {selectedSkills.map((sid) => {
                      const skill = skills?.find((s) => s.id === sid);
                      return skill ? (
                        <span
                          key={sid}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-semibold group"
                        >
                          <i className="fas fa-check text-[9px]" />
                          {skill.name}
                          <button
                            type="button"
                            className="hover:text-red-500 transition-colors ml-0.5"
                            onClick={() => handleRemoveSkill(sid)}
                          >
                            &times;
                          </button>
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
              </div>

              {/* Nice-to-have Skills */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Nice-to-have Skills</label>
                <div className="flex gap-2">
                  <input
                    className="flex-1 px-4 py-2.5 border-[1.5px] border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                    placeholder="Type a skill and press Enter..."
                    value={niceToHaveSkillInput}
                    onChange={(e) => setNiceToHaveSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); addNiceToHave(); }
                    }}
                  />
                  <button
                    type="button"
                    className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors shrink-0"
                    onClick={addNiceToHave}
                  >
                    <i className="fas fa-plus" />
                  </button>
                </div>
                {niceToHaveSkills.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {niceToHaveSkills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium group"
                      >
                        <i className="fas fa-star text-[9px] text-gray-400" />
                        {skill}
                        <button
                          type="button"
                          className="hover:text-red-500 transition-colors ml-0.5"
                          onClick={() => setNiceToHaveSkills(niceToHaveSkills.filter((_, i) => i !== idx))}
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-1.5">
                  <i className="fas fa-info-circle mr-1" />
                  Candidates with these skills are a bonus but not required.
                </p>
              </div>
            </div>
          </div>

          {/* ── Publishing Options ─────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 lg:p-8">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-1.5 h-5 bg-primary rounded-full" />
              <h3 className="text-base font-bold text-gray-900">Publishing Options</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Status</label>
                <select
                  className="w-full px-4 py-2.5 border-[1.5px] border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all bg-white"
                  {...register('status')}
                  disabled={closedJob || hasApplicants}
                >
                  <option value="PUBLISHED">Published (make visible immediately)</option>
                  <option value="DRAFT">Draft (save for later)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Close Date</label>
                <input
                  type="date"
                  min={todayDateInputValue()}
                  className="w-full px-4 py-2.5 border-[1.5px] border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                  {...register('closeDate')}
                  disabled={closedJob || hasApplicants}
                />
                <p className="text-xs text-gray-400 mt-1.5">
                  Jobs disappear from the jobseeker site after this date passes.
                </p>
              </div>
            </div>

            {/* Attachment Upload */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <i className="fas fa-paperclip text-primary mr-1" />
                Job Attachment
              </label>
              {attachmentPreview ? (
                <div className="relative rounded-xl border border-gray-200 overflow-hidden bg-gray-50">
                  {isImageFile(attachmentPreview) ? (
                    <img
                      src={attachmentPreview}
                      alt="Attachment preview"
                      className="w-full max-h-48 object-contain"
                    />
                  ) : (
                    <div className="flex items-center gap-3 p-4">
                      <div className="w-10 h-10 rounded-lg bg-red-50 text-red-500 flex items-center justify-center">
                        <i className="fas fa-file-pdf text-lg" />
                      </div>
                      <span className="text-sm text-gray-600">PDF attached</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleRemoveAttachment}
                    className="absolute top-2 right-2 w-7 h-7 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-200 transition-all shadow-sm"
                  >
                    <i className="fas fa-times text-xs" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 py-8 px-4 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <i className="fas fa-cloud-upload-alt text-primary text-lg" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-700">Click to upload</p>
                    <p className="text-xs text-gray-400 mt-0.5">PDF, PNG, JPG (max 10MB)</p>
                  </div>
                  <input
                    type="file"
                    accept=".pdf,image/png,image/jpeg,image/jpg"
                    className="sr-only"
                    onChange={handleAttachmentChange}
                  />
                </label>
              )}
              {attachmentPreview && (
                <p className="text-xs text-gray-400 mt-1.5">
                  <i className="fas fa-info-circle mr-1" />
                  A new file will replace the existing attachment on save.
                </p>
              )}
            </div>
          </div>

          {/* ── Action Buttons ─────────────────────────────── */}
          <div className="flex items-center justify-end gap-3 pb-4">
            <button
              type="button"
              className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:-translate-y-px hover:shadow-sm transition-all duration-200 flex items-center gap-2"
              onClick={() => navigate(ROUTES.JOBS)}
            >
              <i className="fas fa-arrow-left text-xs" />
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-hover hover:-translate-y-px hover:shadow-md transition-all duration-200 flex items-center gap-2 disabled:opacity-60 shadow-sm shadow-primary/20"
              disabled={createJob.isPending || updateJob.isPending || closedJob || hasApplicants}
            >
              {createJob.isPending || updateJob.isPending ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <i className={`fas ${isEdit ? 'fa-save' : 'fa-paper-plane'} text-xs`} />
                  {isEdit ? 'Save Changes' : 'Create Job'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
