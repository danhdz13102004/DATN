import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { companyService } from '../services/companyService';
import type { CompanyProfileUpdateRequest, CompanyAddressRequest } from '../types/company';

export function useUserProfile() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const { data } = await companyService.getMe();
      return data.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCompanyProfile() {
  return useQuery({
    queryKey: ['company', 'profile'],
    queryFn: async () => {
      const { data } = await companyService.getProfile();
      return data.data;
    },
  });
}

export function useUpdateCompanyProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CompanyProfileUpdateRequest) => companyService.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company', 'profile'] });
    },
  });
}

export function useUploadLogo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => companyService.uploadLogo(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company', 'profile'] });
    },
  });
}

export function useCompanyAddresses() {
  return useQuery({
    queryKey: ['company', 'addresses'],
    queryFn: async () => {
      const { data } = await companyService.getAddresses();
      return data.data;
    },
  });
}

export function useCreateAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CompanyAddressRequest) => companyService.createAddress(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company', 'addresses'] });
    },
  });
}

export function useUpdateAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CompanyAddressRequest }) =>
      companyService.updateAddress(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company', 'addresses'] });
    },
  });
}

export function useDeleteAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => companyService.deleteAddress(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company', 'addresses'] });
    },
  });
}

export function useSetDefaultAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => companyService.setDefaultAddress(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company', 'addresses'] });
    },
  });
}
