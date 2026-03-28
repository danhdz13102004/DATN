export type InterviewStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';
export type MeetingType = 'ONLINE' | 'OFFLINE';

export interface Interview {
  id: string;
  applicationId: string;
  applicantName: string;
  applicantEmail: string;
  applicantInitials: string;
  jobTitle: string;
  scheduledDate: string;
  scheduledTime: string;
  meetingType: MeetingType;
  meetingLink: string;
  notes: string;
  status: InterviewStatus;
}

export interface InterviewFormData {
  applicationId: string;
  scheduledDate: string;
  scheduledTime: string;
  meetingType: MeetingType;
  meetingLink: string;
  notes: string;
}

export interface InterviewStats {
  pending: number;
  completed: number;
  cancelled: number;
}
