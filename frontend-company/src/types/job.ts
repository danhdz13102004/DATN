export type JobStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED';
export type JobType = 'FULLTIME' | 'PARTTIME' | 'REMOTE' | 'HYBRID';
export type ExperienceLevel = 'INTERN' | 'FRESHER' | 'JUNIOR' | 'MIDDLE' | 'SENIOR' | 'LEADER';

export interface Industry {
  id: string;
  name: string;
}

export interface Job {
  id: string;
  title: string;
  description: string;
  industry: Industry | null;
  responsibilities: string[];
  requirements: string[];
  jobType: JobType;
  experienceLevels: ExperienceLevel[];
  location: string;
  salaryMin: number | null;
  salaryMax: number | null;
  status: JobStatus;
  closeDate?: string | null;
  skills: Skill[];
  niceToHaveSkills: string[];
  applicationCount: number;
  createdAt: string;
  updatedAt: string;
  attachmentUrl?: string;
  companyAddressId?: string;
}

export interface JobFormData {
  title: string;
  description: string;
  industryId?: string;
  responsibilities: string[];
  requirements: string[];
  jobType: JobType;
  levels: ExperienceLevel[];
  location: string;
  addressId?: string;
  salaryMin?: number;
  salaryMax?: number;
  skillIds: string[];
  niceToHaveSkills: string[];
  status: JobStatus;
  closeDate?: string | null;
  attachmentUrl?: string;
}

export interface JobSelectOption {
  id: string;
  title: string;
}

export interface Skill {
  id: string;
  name: string;
}

export interface JobAutoFillDto {
  jobTitle?: string;
  industry?: string;
  jobType?: string;
  experienceLevels?: string[];
  location?: string;
  salaryMin?: number;
  salaryMax?: number;
  skills?: string[];
  responsibilities?: string[];
  requirements?: string[];
  niceToHaveSkills?: string[];
  description?: string;
  mustHaveSkills?: string[];
}

export type JobAutoFillApiResponse = JobAutoFillDto;
