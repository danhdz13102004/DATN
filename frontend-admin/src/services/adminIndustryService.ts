import api from './api';
import type { AdminIndustry } from '../types/admin';

export const adminIndustryService = {
  list: async (): Promise<AdminIndustry[]> => {
    const res = await api.get<{ data: AdminIndustry[] }>('/industries');
    return res.data.data;
  },

  create: async (name: string): Promise<AdminIndustry> => {
    const res = await api.post<{ data: AdminIndustry }>('/industries', { name });
    return res.data.data;
  },

  update: async (id: string, name: string): Promise<AdminIndustry> => {
    const res = await api.put<{ data: AdminIndustry }>(`/industries/${id}`, { name });
    return res.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/industries/${id}`);
  },
};
