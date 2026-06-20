import api from './api';

export type JobSearchAction = 'clear' | 'sync' | 'clear-and-sync';
export type JobSearchScope = 'ALL' | 'COMPANY' | 'JOB';

export interface JobSearchOperationResult {
  action: JobSearchAction;
  scope: JobSearchScope;
  id?: string;
  cleared?: number;
  clearedAll?: boolean;
  indexed?: number;
}

export const adminJobSearchService = {
  run: async (
    action: JobSearchAction,
    scope: JobSearchScope,
    id?: string
  ): Promise<JobSearchOperationResult> => {
    const params = new URLSearchParams({ scope });
    if (id) params.append('id', id);

    const res = await api.post<{ data: JobSearchOperationResult }>(
      `/admin/job-search/${action}?${params}`
    );
    return res.data.data;
  },
};
