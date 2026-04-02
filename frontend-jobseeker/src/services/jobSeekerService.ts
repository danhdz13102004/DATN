import api from './api';
import type { JobSeekerProfile } from '../types/jobseeker';
import type { Skill } from '../types/job';

export const jobSeekerService = {
  getProfile: () =>
    api.get<{ data: JobSeekerProfile }>('/jobseeker/profile').then(r => r.data.data),

  updateProfile: (data: { bio?: string; location?: string; experienceYears?: number }) =>
    api.put('/jobseeker/profile', data).then(r => r.data.data),

  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    // Set Content-Type to undefined to clear the axios instance default (application/json)
    // so axios can auto-detect FormData and set: multipart/form-data; boundary=...
    return api.post('/jobseeker/avatar', formData, {
      headers: { 'Content-Type': undefined },
    }).then(r => r.data);
  },

  getSkills: () =>
    api.get<{ data: Skill[] }>('/jobseeker/skills').then(r => r.data.data),

  addSkill: (skillName: string) =>
    api.post('/jobseeker/skills', { skillName }).then(r => r.data.data),

  removeSkill: (skillId: string) =>
    api.delete(`/jobseeker/skills/${skillId}`).then(r => r.data),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post('/auth/change-password', data).then(r => r.data),
};
