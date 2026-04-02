export type InterviewStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';
export type MeetingType = 'ONLINE' | 'OFFLINE';

export interface InterviewListItem {
  id: string;
  jobTitle: string;
  jobId: string;
  companyName: string;
  companyInitial: string;
  scheduledTime: string;
  meetingType: MeetingType;
  meetingLink: string | null;
  status: InterviewStatus;
  note: string | null;
}

export interface InterviewStats {
  upcoming: number;
  completed: number;
  cancelled: number;
}
