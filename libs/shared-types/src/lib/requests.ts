import type { UnitSystem } from './weather';

export interface UpdatePreferencesRequest {
  unitSystem: UnitSystem;
}

export interface SaveLocationRequest {
  name: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
  isDefault?: boolean;
}

export type UpdateSavedLocationRequest = SaveLocationRequest;

export interface ReorderSavedLocationsRequest {
  locationIds: number[];
}
