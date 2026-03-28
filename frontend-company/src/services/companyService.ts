import api from './api';
import type { ApiResponse } from '../types/common';
import type {
  CompanyProfile,
  CompanyProfileUpdateRequest,
  CompanyAddress,
  CompanyAddressRequest,
  UserProfile,
} from '../types/company';

export const companyService = {
  getMe: () =>
    api.get<ApiResponse<UserProfile>>('/auth/me'),

  getProfile: () =>
    api.get<ApiResponse<CompanyProfile>>('/company/profile'),

  updateProfile: (data: CompanyProfileUpdateRequest) =>
    api.put<ApiResponse<CompanyProfile>>('/company/profile', data),

  uploadLogo: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<ApiResponse<{ logoUrl: string }>>('/company/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  getAddresses: () =>
    api.get<ApiResponse<CompanyAddress[]>>('/company/addresses'),

  createAddress: (data: CompanyAddressRequest) =>
    api.post<ApiResponse<CompanyAddress>>('/company/addresses', data),

  updateAddress: (id: string, data: CompanyAddressRequest) =>
    api.put<ApiResponse<CompanyAddress>>(`/company/addresses/${id}`, data),

  deleteAddress: (id: string) =>
    api.delete<ApiResponse<null>>(`/company/addresses/${id}`),

  setDefaultAddress: (id: string) =>
    api.patch<ApiResponse<null>>(`/company/addresses/${id}/default`),
};
