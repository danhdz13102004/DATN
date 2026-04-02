import api from './api';
import type { Resume } from '../types/resume';

export const resumeService = {
  listResumes: () =>
    api.get<{ data: Resume[] }>('/resumes').then(r => r.data.data),

  upload: (file: File, label?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (label) formData.append('label', label);
    return api.post('/resumes', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },

  replace: (id: string, file?: File, label?: string) => {
    const formData = new FormData();
    if (file) formData.append('file', file);
    if (label) formData.append('label', label);
    return api.put(`/resumes/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },

  download: (id: string) =>
    api.get<{ data: { url: string } }>(`/resumes/${id}/download`).then(r => r.data.data.url),

  setPrimary: (id: string) =>
    api.patch(`/resumes/${id}/primary`).then(r => r.data),

  delete: (id: string) =>
    api.delete(`/resumes/${id}`).then(r => r.data),
};
