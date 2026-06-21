import { useEffect, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useNavigate, useParams, useSearchParams, useOutletContext } from 'react-router-dom';
import Topbar from '../../components/layout/Topbar';
import { useInterviewDetail, useCreateInterview, useUpdateInterview, splitScheduledTime } from '../../hooks/useInterviews';
import { useApplicationDetail, useApplicationSelectOptions } from '../../hooks/useApplications';
import { ROUTES } from '../../constants';
import type { InterviewFormData } from '../../types/interview';

function formatLocalDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function getScheduledDateTime(date: string, time: string): Date | null {
  if (!date || !time) return null;

  const scheduledDateTime = new Date(`${date}T${time}`);
  return Number.isNaN(scheduledDateTime.getTime()) ? null : scheduledDateTime;
}

function getApplicationIdFromQuery(value: string | null): string {
  const match = value?.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
  return match?.[0] ?? '';
}

export default function InterviewSchedulePage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { onMenuToggle } = useOutletContext<{ onMenuToggle: () => void }>();
  const isEdit = !!id;

  // Pre-filled applicationId from query param (e.g. /interviews/schedule?applicationId=xxx)
  const prefilledAppId = getApplicationIdFromQuery(searchParams.get('applicationId'));

  const { data: interview } = useInterviewDetail(id || '');
  const { data: appOptions } = useApplicationSelectOptions();
  const { data: prefilledApp } = useApplicationDetail(!isEdit ? prefilledAppId : '');
  const createInterview = useCreateInterview();
  const updateInterview = useUpdateInterview();
  const today = formatLocalDate(new Date());

  const { control, register, handleSubmit, reset, setValue, getValues, trigger, formState: { errors } } = useForm<InterviewFormData>({
    defaultValues: {
      applicationId: prefilledAppId,
      meetingType: 'ONLINE',
      scheduledDate: '',
      scheduledTime: '',
      meetingLink: '',
      note: '',
    },
  });
  const selectedApplicationId = useWatch({ control, name: 'applicationId' }) ?? '';
  const prefilledOption = appOptions?.find((opt) => opt.id === prefilledAppId);
  const prefilledAlreadyScheduled = !isEdit && !!prefilledAppId && (
    prefilledOption?.hasScheduledInterview === true ||
    prefilledApp?.hasScheduledInterview === true
  );
  const availableAppOptions = useMemo(
    () => (isEdit ? appOptions ?? [] : (appOptions ?? []).filter((opt) => !opt.hasScheduledInterview)),
    [appOptions, isEdit]
  );
  const hasAvailablePrefilledOption = availableAppOptions.some((opt) => opt.id === prefilledAppId);
  const showPrefilledFallback = !isEdit && !!prefilledAppId && !prefilledAlreadyScheduled && !hasAvailablePrefilledOption;

  // When editing, pre-fill form from fetched interview data
  useEffect(() => {
    if (isEdit && interview) {
      // Split the ISO Instant back into separate date + time for the form inputs
      const { scheduledDate, scheduledTime } = splitScheduledTime(interview.scheduledTime);
      reset({
        applicationId: interview.applicationId,
        scheduledDate,
        scheduledTime,
        meetingType: interview.meetingType,
        meetingLink: interview.meetingLink ?? '',
        note: interview.note ?? '',
      });
    }
  }, [isEdit, interview, reset]);

  // Keep the create form in sync when /interviews/schedule?applicationId=... is opened directly.
  useEffect(() => {
    if (!isEdit && prefilledAppId) {
      setValue('applicationId', prefilledAlreadyScheduled ? '' : prefilledAppId, { shouldValidate: true });
    }
  }, [isEdit, prefilledAlreadyScheduled, prefilledAppId, setValue]);

  const validateScheduledDate = (value: string) => (
    value >= formatLocalDate(new Date()) || 'Date cannot be in the past'
  );

  const validateScheduledTime = (value: string) => {
    const selectedDateTime = getScheduledDateTime(getValues('scheduledDate'), value);
    if (!selectedDateTime) return true;

    return selectedDateTime > new Date() || 'Interview time must be in the future';
  };

  const onSubmit = async (data: InterviewFormData) => {
    try {
      if (isEdit) {
        await updateInterview.mutateAsync({ id: id!, data });
      } else {
        await createInterview.mutateAsync(data);
      }
      navigate(ROUTES.INTERVIEWS);
    } catch {
      // Error handled by React Query / axios interceptor
    }
  };

  return (
    <>
      <Topbar
        title={isEdit ? 'Reschedule Interview' : 'Schedule Interview'}
        breadcrumbs={[{ label: 'Interviews', to: ROUTES.INTERVIEWS }, { label: isEdit ? 'Reschedule' : 'Schedule' }]}
        onMenuToggle={onMenuToggle}
      />
      <div className="p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-50 max-w-[80%] mx-auto">
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">

            {/* Application */}
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Application <span className="text-red-500">*</span>
              </label>
              <select
                className={`w-full px-3.5 py-2.5 border-[1.5px] rounded-xl text-sm focus:outline-none focus:border-primary ${errors.applicationId ? 'border-red-500' : 'border-gray-200'}`}
                {...register('applicationId', { required: 'Please select an application' })}
                value={selectedApplicationId}
                disabled={isEdit}
              >
                <option value="">Select an application...</option>
                {showPrefilledFallback && (
                  <option value={prefilledAppId}>
                    {prefilledApp
                      ? `${prefilledApp.jobTitle} - ${prefilledApp.candidateName} - ${prefilledApp.candidateEmail}`
                      : 'Selected application'}
                  </option>
                )}
                {availableAppOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.jobTitle} - {opt.candidateName} - {opt.candidateEmail}
                  </option>
                ))}
              </select>
              {prefilledAlreadyScheduled && (
                <span className="text-amber-600 text-xs mt-1 block">
                  This application already has an interview scheduled. Please reschedule it from the Interviews page.
                </span>
              )}
              {errors.applicationId && (
                <span className="text-red-500 text-xs mt-1 block">{errors.applicationId.message}</span>
              )}
            </div>

            {/* Date + Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  min={today}
                  className={`w-full px-3.5 py-2.5 border-[1.5px] rounded-xl text-sm focus:outline-none focus:border-primary ${errors.scheduledDate ? 'border-red-500' : 'border-gray-200'}`}
                  {...register('scheduledDate', {
                    required: 'Date is required',
                    validate: validateScheduledDate,
                    onChange: () => {
                      if (getValues('scheduledTime')) void trigger('scheduledTime');
                    },
                  })}
                />
                {errors.scheduledDate && (
                  <span className="text-red-500 text-xs mt-1 block">{errors.scheduledDate.message}</span>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  className={`w-full px-3.5 py-2.5 border-[1.5px] rounded-xl text-sm focus:outline-none focus:border-primary ${errors.scheduledTime ? 'border-red-500' : 'border-gray-200'}`}
                  {...register('scheduledTime', {
                    required: 'Time is required',
                    validate: validateScheduledTime,
                  })}
                />
                {errors.scheduledTime && (
                  <span className="text-red-500 text-xs mt-1 block">{errors.scheduledTime.message}</span>
                )}
              </div>
            </div>

            {/* Meeting Type */}
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Meeting Type <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full px-3.5 py-2.5 border-[1.5px] border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary"
                {...register('meetingType', { required: true })}
              >
                <option value="ONLINE">Online</option>
                <option value="OFFLINE">Offline</option>
              </select>
            </div>

            {/* Meeting Link / Location */}
            <div>
              <label className="block text-sm font-medium mb-1.5">Meeting Link / Location</label>
              <input
                className="w-full px-3.5 py-2.5 border-[1.5px] border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/10"
                placeholder="e.g. https://meet.google.com/abc-xyz or office address"
                {...register('meetingLink')}
              />
              <div className="text-xs text-gray-400 mt-1">
                For online interviews, paste the meeting URL. For offline, enter the address.
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium mb-1.5">Notes</label>
              <textarea
                className="w-full px-3.5 py-2.5 border-[1.5px] border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/10 min-h-[100px]"
                placeholder="Add any notes for this interview (round details, topics to cover...)"
                {...register('note')}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 flex items-center gap-2"
                onClick={() => navigate(ROUTES.INTERVIEWS)}
              >
                <i className="fas fa-arrow-left" /> Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-hover transition-colors flex items-center gap-2 disabled:opacity-60"
                disabled={prefilledAlreadyScheduled || createInterview.isPending || updateInterview.isPending}
              >
                <i className="fas fa-calendar-check" />
                {isEdit ? 'Update Interview' : 'Schedule Interview'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
