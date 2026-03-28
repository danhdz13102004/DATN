export interface DashboardStats {
  totalJobs: number;
  activeApplications: number;
  interviewsThisWeek: number;
  newMessages: number;
  jobsTrend: number;
  applicationsTrend: number;
  interviewsPending: number;
  messagesUnread: number;
}

export interface RecentApplication {
  id: string;
  applicantName: string;
  applicantInitials: string;
  jobTitle: string;
  aiScore: number;
  status: string;
  appliedDate: string;
}
