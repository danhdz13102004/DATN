import api from './api';
import type { ApiResponse } from '../types/common';

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

export const locationService = {
  getCountries: () =>
    api.get<ApiResponse<Country[]>>('/countries'),

  getCities: (countryId: number) =>
    api.get<ApiResponse<City[]>>(`/countries/${countryId}/cities`),

  detectCountryByIp: (ip?: string) =>
    api.get<ApiResponse<Country | null>>('/countries/detect-by-ip', {
      params: ip ? { ip } : {},
    }),
};
