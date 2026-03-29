import api from './api';
import type { ApiResponse } from '../types/common';
import type { StaffMember, CreateStaffRequest, UpdateStaffRequest } from '../types/staff';

export const staffService = {
  getStaff: () =>
    api.get<ApiResponse<StaffMember[]>>('/company/staff'),

  createStaff: (data: CreateStaffRequest) =>
    api.post<ApiResponse<StaffMember>>('/company/staff', data),

  updateName: (id: string, data: UpdateStaffRequest) =>
    api.put<ApiResponse<StaffMember>>(`/company/staff/${id}`, data),

  deleteStaff: (id: string) =>
    api.delete<ApiResponse<{ message: string }>>(`/company/staff/${id}`),
};
