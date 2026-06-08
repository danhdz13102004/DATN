import api from './api';
import type { ApiResponse } from '../types/common';
import type {
  CompanyProfile,
  CompanyProfileUpdateRequest,
  CompanyAddress,
  CompanyAddressRequest,
  UserProfile,
} from '../types/company';

const normalizeAddress = (address: CompanyAddress): CompanyAddress => ({
  ...address,
  isDefault: address.isDefault ?? address.default ?? false,
});

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

  getAddresses: async () => {
    const res = await api.get<ApiResponse<CompanyAddress[]>>('/company/addresses');
    return {
      ...res,
      data: {
        ...res.data,
        data: res.data.data.map(normalizeAddress),
      },
    };
  },

  createAddress: async (data: CompanyAddressRequest) => {
    const res = await api.post<ApiResponse<CompanyAddress>>('/company/addresses', data);
    return {
      ...res,
      data: {
        ...res.data,
        data: normalizeAddress(res.data.data),
      },
    };
  },

  updateAddress: async (id: string, data: CompanyAddressRequest) => {
    const res = await api.put<ApiResponse<CompanyAddress>>(`/company/addresses/${id}`, data);
    return {
      ...res,
      data: {
        ...res.data,
        data: normalizeAddress(res.data.data),
      },
    };
  },

  deleteAddress: (id: string) =>
    api.delete<ApiResponse<null>>(`/company/addresses/${id}`),

  setDefaultAddress: (id: string) =>
    api.patch<ApiResponse<null>>(`/company/addresses/${id}/default`),
};
