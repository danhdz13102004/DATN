// ── Pagination ──────────────────────────────────────────
export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
}

export interface ApiListResponse<T> {
  success: boolean;
  data: T[];
  meta: PaginationMeta;
}

// ── Enums ────────────────────────────────────────────────
export type UserRole = 'ADMIN' | 'COMPANY_OWNER' | 'COMPANY_STAFF' | 'JOB_SEEKER';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';
export type CompanyVerified = 'all' | 'true' | 'false';
export type JobStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'ARCHIVED';
export type ApplicationStatus = 'APPLIED' | 'SCREENING' | 'INTERVIEW' | 'OFFER' | 'REJECTED' | 'HIRED' | 'WITHDRAWN';

// ── Admin Stats ──────────────────────────────────────────
export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  pendingUsers: number;
  totalCompanies: number;
  verifiedCompanies: number;
  pendingCompanies: number;
  totalJobs: number;
  publishedJobs: number;
  totalApplications: number;
  appliedApplications: number;
}

// ── User ─────────────────────────────────────────────────
export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

// ── Company ──────────────────────────────────────────────
export interface AdminCompany {
  id: string;
  name: string;
  website: string | null;
  logoUrl: string | null;
  verified: boolean;
  blocked: boolean;
  createdAt: string;
  staffCount: number;
  activeJobsCount: number;
}

export interface AdminCompanyStaffItem {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  role: 'OWNER' | 'HR' | 'RECRUITER';
  joinedAt: string;
}

export interface AdminCompanyJobItem {
  id: string;
  title: string;
  jobType: string | null;
  experienceLevels: string[];
  status: string;
  applicationCount: number;
  createdAt: string;
}

export interface AdminCompanyDetail {
  id: string;
  name: string;
  description: string | null;
  website: string | null;
  logoUrl: string | null;
  verified: boolean;
  blocked: boolean;
  createdAt: string;
  updatedAt: string | null;
  staff: AdminCompanyStaffItem[];
  activeJobs: AdminCompanyJobItem[];
  totalStaff: number;
  totalActiveJobs: number;
}

// ── Job ──────────────────────────────────────────────────
export interface AdminJob {
  id: string;
  title: string;
  companyId: string;
  location: string | null;
  jobType: string | null;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AdminJobDetailCompany {
  id: string;
  name: string;
  description: string | null;
  website: string | null;
  logoUrl: string | null;
  verified: boolean;
  location: string | null;
  industry: string | null;
  staffCount: number | null;
  foundedAt: string | null;
  benefits: string | null;
  activeJobsCount: number;
}

export interface AdminJobDetail extends AdminJob {
  companyAddressId: string | null;
  description: string | null;
  industry: { id: string; name: string } | null;
  responsibilities: string[] | null;
  requirements: string[] | null;
  niceToHaveSkills: string[] | null;
  benefits: string[] | null;
  jobDataStructure: Record<string, unknown> | null;
  experienceLevels: string[];
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  addressDetail: string | null;
  skills: { id: string; name: string }[];
  company: AdminJobDetailCompany | null;
  attachmentUrl?: string | null;
}

// ── Subscription Plans ───────────────────────────────────
export type SubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED';

export interface AdminPlan {
  id: string;
  name: string;
  price: number;
  jobPostLimit: number;     // 0 = unlimited
  durationDays: number;
  allowUseAiMatching: boolean;
  autoFillLimit: number;    // 0 = unlimited
  createdAt: string;
  activeSubscriptions: number;
}

export interface AdminSubscription {
  id: string;
  companyId: string;
  companyName: string;
  planId: string;
  planName: string;
  startDate: string;
  endDate: string;
  status: SubscriptionStatus;
  jobsPostedCount: number;
  createdAt: string;
}

export interface CreatePlanRequest {
  name: string;
  price: number;
  durationDays: number;
  jobPostLimit: number;
  allowUseAiMatching: boolean;
  autoFillLimit: number;    // 0 = unlimited
}

// ── Application ──────────────────────────────────────────
export interface AdminApplication {
  id: string;
  jobId: string;
  jobSeekerId: string;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
  job?: {
    id: string;
    title: string;
    companyId: string;
  };
}

// ── Skill ─────────────────────────────────────────────────
export interface AdminSkill {
  id: string;
  name: string;
  jobUsageCount: number;
}

// ── Industry ───────────────────────────────────────────────
export interface AdminIndustry {
  id: string;
  name: string;
  jobUsageCount: number;
}
