import api from './api';
import type { AdminSkill } from '../types/admin';

export const adminSkillService = {
  list: async (): Promise<AdminSkill[]> => {
    const res = await api.get<{ data: AdminSkill[] }>('/skills');
    return res.data.data;
  },

  create: async (name: string): Promise<AdminSkill> => {
    const res = await api.post<{ data: AdminSkill }>('/skills', { name });
    return res.data.data;
  },

  update: async (id: string, name: string): Promise<AdminSkill> => {
    const res = await api.put<{ data: AdminSkill }>(`/skills/${id}`, { name });
    return res.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/skills/${id}`);
  },
};
