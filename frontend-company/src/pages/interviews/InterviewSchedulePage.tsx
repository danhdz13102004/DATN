import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams, useOutletContext } from 'react-router-dom';
import Topbar from '../../components/layout/Topbar';
import { useInterviewDetail, useCreateInterview, useUpdateInterview } from '../../hooks/useInterviews';
import { useApplicationSelectOptions } from '../../hooks/useApplications';
import { ROUTES } from '../../constants';
import type { InterviewFormData } from '../../types/interview';

export default function InterviewSchedulePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { onMenuToggle } = useOutletContext<{ onMenuToggle: () => void }>();
  const isEdit = !!id;
  const { data: interview } = useInterviewDetail(id || '');
  const { data: appOptions } = useApplicationSelectOptions();
  const createInterview = useCreateInterview();
  const updateInterview = useUpdateInterview();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<InterviewFormData>();

  useEffect(() => {
    if (isEdit && interview) {
      reset({
        applicationId: interview.applicationId,
        scheduledDate: interview.scheduledDate,
        scheduledTime: interview.scheduledTime,
        meetingType: interview.meetingType,
        meetingLink: interview.meetingLink,
        notes: interview.notes,
      });
    }
  }, [isEdit, interview, reset]);

  const onSubmit = async (data: InterviewFormData) => {
    try {
      if (isEdit) {
        await updateInterview.mutateAsync({ id: id!, data });
      } else {
        await createInterview.mutateAsync(data);
      }
      navigate(ROUTES.INTERVIEWS);
    } catch {
      // Error handled by React Query
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
        <div className="bg-white rounded-2xl shadow-sm border border-gray-50 max-w-[700px]">
          <div className="p-5 border-b border-gray-50">
            <h3 className="text-lg font-bold text-gray-900">Interview Details</h3>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1.5">Application <span className="text-red-500">*</span></label>
              <select className={`w-full px-3.5 py-2.5 border-[1.5px] rounded-xl text-sm focus:outline-none focus:border-primary ${errors.applicationId ? 'border-red-500' : 'border-gray-200'}`} {...register('applicationId', { required: 'Please select an application' })}>
                <option value="">Select an application...</option>
                {appOptions?.map((opt) => (
                  <option key={opt.id} value={opt.id}>{opt.applicantName} — {opt.jobTitle}</option>
                ))}
              </select>
              {errors.applicationId && <span className="text-red-500 text-xs mt-1 block">{errors.applicationId.message}</span>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Date <span className="text-red-500">*</span></label>
                <input type="date" className="w-full px-3.5 py-2.5 border-[1.5px] border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary" {...register('scheduledDate', { required: true })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Time <span className="text-red-500">*</span></label>
                <input type="time" className="w-full px-3.5 py-2.5 border-[1.5px] border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary" {...register('scheduledTime', { required: true })} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Meeting Type <span className="text-red-500">*</span></label>
              <select className="w-full px-3.5 py-2.5 border-[1.5px] border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary" {...register('meetingType', { required: true })}>
                <option value="ONLINE">Online</option>
                <option value="OFFLINE">Offline</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Meeting Link / Location</label>
              <input className="w-full px-3.5 py-2.5 border-[1.5px] border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/10" placeholder="e.g. https://meet.google.com/abc-xyz or office address" {...register('meetingLink')} />
              <div className="text-xs text-gray-400 mt-1">For online interviews, paste the meeting URL. For offline, enter the address.</div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Notes</label>
              <textarea className="w-full px-3.5 py-2.5 border-[1.5px] border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/10 min-h-[100px]" placeholder="Add any notes for this interview (round details, topics to cover...)" {...register('notes')} />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 flex items-center gap-2" onClick={() => navigate(ROUTES.INTERVIEWS)}>
                <i className="fas fa-arrow-left" /> Cancel
              </button>
              <button type="submit" className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-hover transition-colors flex items-center gap-2 disabled:opacity-60" disabled={createInterview.isPending || updateInterview.isPending}>
                <i className="fas fa-calendar-check" /> {isEdit ? 'Update Interview' : 'Schedule Interview'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
