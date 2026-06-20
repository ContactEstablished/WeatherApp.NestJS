import type {
  LocationSuggestion,
  UnitSystem,
  WeatherDashboard,
} from '@nimbus/shared-types';

/**
 * DI token for the weather provider. Bound in WeatherModule to a facade that
 * uses OpenWeatherService when a key is configured and the upstream call
 * succeeds, falling back to MockWeatherService otherwise.
 */
export const WEATHER_SERVICE = Symbol('WEATHER_SERVICE');

/**
 * Contract shared by the OpenWeather (primary) and Mock (fallback) providers.
 */
export interface IWeatherService {
  getDashboard(
    location: string,
    unitSystem: UnitSystem,
    userId: string,
  ): Promise<WeatherDashboard>;

  searchLocations(query: string): Promise<LocationSuggestion[]>;
}
