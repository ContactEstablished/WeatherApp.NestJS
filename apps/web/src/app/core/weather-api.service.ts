import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import type {
  LocationSuggestion,
  ReorderSavedLocationsRequest,
  UnitSystem,
  UserPreferences,
  WeatherDashboard,
} from '@nimbus/shared-types';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class WeatherApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = environment.apiBaseUrl;
  private readonly userId = 'anonymous';

  // #2 — GET /api/weather/dashboard
  getWeatherDashboard(location: string, unitSystem: UnitSystem): Observable<WeatherDashboard> {
    const params = new HttpParams()
      .set('location', location)
      .set('unitSystem', unitSystem)
      .set('userId', this.userId);
    return this.http.get<WeatherDashboard>(`${this.apiBaseUrl}/api/weather/dashboard`, { params });
  }

  // #3 — GET /api/weather/locations
  searchLocations(query: string): Observable<LocationSuggestion[]> {
    const params = new HttpParams().set('query', query);
    return this.http.get<LocationSuggestion[]>(`${this.apiBaseUrl}/api/weather/locations`, { params });
  }

  // #4 — GET /api/users/anonymous/preferences
  getPreferences(): Observable<UserPreferences> {
    return this.http.get<UserPreferences>(`${this.apiBaseUrl}/api/users/${this.userId}/preferences`);
  }

  // #5 — PUT /api/users/anonymous/preferences
  updatePreferences(unitSystem: UnitSystem): Observable<UserPreferences> {
    const body: Pick<UserPreferences, 'unitSystem'> = { unitSystem };
    return this.http.put<UserPreferences>(
      `${this.apiBaseUrl}/api/users/${this.userId}/preferences`,
      body,
    );
  }

  // #6 — GET /api/users/anonymous/locations
  getSavedLocations(): Observable<LocationSuggestion[]> {
    return this.http.get<LocationSuggestion[]>(
      `${this.apiBaseUrl}/api/users/${this.userId}/locations`,
    );
  }

  // #7 — POST /api/users/anonymous/locations  (204 No Content)
  saveLocation(location: LocationSuggestion): Observable<void> {
    return this.http.post<void>(
      `${this.apiBaseUrl}/api/users/${this.userId}/locations`,
      { ...location, isDefault: false },
    );
  }

  // #8 — PUT /api/users/anonymous/locations/{id}  (204 No Content)
  updateSavedLocation(location: LocationSuggestion): Observable<void> {
    if (!location.id) {
      return throwError(() => new Error('Cannot update a location without an id.'));
    }
    return this.http.put<void>(
      `${this.apiBaseUrl}/api/users/${this.userId}/locations/${location.id}`,
      location,
    );
  }

  // #9 — DELETE /api/users/anonymous/locations/{id}  (204 No Content)
  deleteSavedLocation(locationId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.apiBaseUrl}/api/users/${this.userId}/locations/${locationId}`,
    );
  }

  // #11 — PUT /api/users/anonymous/locations/reorder  (204 No Content)
  reorderSavedLocations(locationIds: number[]): Observable<void> {
    const body: ReorderSavedLocationsRequest = { locationIds };
    return this.http.put<void>(
      `${this.apiBaseUrl}/api/users/${this.userId}/locations/reorder`,
      body,
    );
  }

  // #10 — PUT /api/users/anonymous/locations/{id}/default  (204 No Content)
  setDefaultLocation(locationId: number): Observable<void> {
    return this.http.put<void>(
      `${this.apiBaseUrl}/api/users/${this.userId}/locations/${locationId}/default`,
      null,
    );
  }
}
