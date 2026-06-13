export interface Country {
  id: number;
  iso2: string;
  iso3: string | null;
  name: string;
  latitude: number | null;
  longitude: number | null;
}

export interface City {
  id: number;
  countryId: number;
  name: string;
}

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
  countryId?: number;
  cityId?: number;
  isDefault: boolean;
  default?: boolean;
}

export interface CompanyAddressRequest {
  label: string;
  addressLine: string;
  city: string;
  country: string;
  countryId?: number;
  cityId?: number;
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
