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
  skills: Skill[];
  niceToHaveSkills: string[];
  applicationCount: number;
  createdAt: string;
  updatedAt: string;
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
  description?: string;
  jobType?: JobType;
  experienceLevels?: ExperienceLevel[];
  location?: string;
  salaryMin?: number;
  salaryMax?: number;
  industry?: string;
  responsibilities?: string[];
  requirements?: string[];
  mustHaveSkills?: string[];
  niceToHaveSkills?: string[];
}

/** Snake_case shape matching the actual BE API response keys */
export interface JobAutoFillApiResponse {
  job_title?: string;
  description?: string;
  job_type?: string;
  experience_levels?: string[];
  location?: string;
  salary_min?: number;
  salary_max?: number;
  industry?: string;
  responsibilities?: string[];
  requirements?: string[];
  must_have_skills?: string[];
  nice_to_have_skills?: string[];
}
