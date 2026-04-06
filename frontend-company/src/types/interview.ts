export type InterviewStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';
export type MeetingType = 'ONLINE' | 'OFFLINE';

/** Matches backend InterviewResponseDto — scheduledTime is an ISO Instant string */
export interface Interview {
  id: string;
  applicationId: string;
  // Candidate info (mapped by backend from Application → JobSeeker → User)
  candidateName: string;
  candidateEmail: string;
  candidateAvatar: string | null;
  // Job info
  jobTitle: string;
  // Schedule
  scheduledTime: string;   // ISO Instant string from backend
  meetingType: MeetingType;
  meetingLink: string;
  status: InterviewStatus;
  note: string;            // backend field name is "note" (not "notes")
  interviewerName: string | null;
  createdAt: string;
}

/**
 * Internal form shape used by InterviewSchedulePage.
 * date + time are kept separate for UX; service layer combines them into a
 * single ISO Instant string before calling the API.
 */
export interface InterviewFormData {
  applicationId: string;
  scheduledDate: string;    // "YYYY-MM-DD"  (HTML date input value)
  scheduledTime: string;    // "HH:MM"       (HTML time input value)
  meetingType: MeetingType;
  meetingLink: string;
  note: string;             // must match backend field name
}

export interface InterviewStats {
  total: number;
  pending: number;
  completed: number;
  cancelled: number;
}
