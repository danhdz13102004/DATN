export interface CompanyProfile {
  id: string;
  name: string;
  website: string;
  description: string;
  logoUrl: string | null;
  isVerified: boolean;
  createdAt: string;
}

export interface CompanyProfileUpdateRequest {
  name: string;
  website: string;
  description: string;
}

export interface CompanyAddress {
  id: string;
  label: string;
  addressLine: string;
  city: string;
  country: string;
  isDefault: boolean;
}

export interface CompanyAddressRequest {
  label: string;
  addressLine: string;
  city: string;
  country: string;
  isDefault: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: string;
  companyId: string;
  companyRole: string;
  companyName: string;
  avatarUrl: string | null;
}
