export interface Skill {
  id: string;
  name: string;
}

export interface Industry {
  id: string;
  name: string;
}

export interface Country {
  id: number;
  iso2: string;
  iso3: string | null;
  name: string;
  latitude: number | null;
  longitude: number | null;
}

export interface City {
  id: number;
  countryId: number;
  name: string;
}

export interface Job {
  id: string;
  companyId: string;
  companyAddressId: string;
  title: string;
  description: string;
  industry: Industry | null;
  responsibilities: string[] | null;
  requirements: string[] | null;
  niceToHaveSkills: string[] | null;
  experienceLevels: string[];
  location: string;
  salaryMin: number | null;
  salaryMax: number | null;
  jobType: string;
  status: string;
  closeDate?: string | null;
  skills: Skill[];
  createdAt: string;
  updatedAt: string;
  isSaved?: boolean;
  isApplied?: boolean;
  companyName?: string;
  company?: CompanyDetail;
  attachmentUrl?: string;
  logoUrl?: string | null;
}

export interface CompanyDetail {
  id: string;
  name: string;
  description: string | null;
  website: string | null;
  logoUrl: string | null;
  verified: boolean;
  location: string | null;
  industry: string | null;
  staffCount: number;
  foundedAt: string | null;
  benefits: string | null;
  activeJobsCount: number;
}

export interface SavedJobDto {
  savedJobId: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  location: string;
  jobType: string;
  salaryMin: number | null;
  salaryMax: number | null;
  savedAt: string;
  isSaved: boolean;
}

export type InteractionEventType = 'click' | 'save' | 'apply';

export interface JobFilter {
  keyword?: string;
  jobType?: string;
  experienceLevels?: string[];
  location?: string;
  countryId?: number;
  cityId?: number;
  salaryMin?: number;
  salaryMax?: number;
  page?: number;
  size?: number;
}
