import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type {
  LocationSuggestion,
  UnitSystem,
  WeatherDashboard,
} from '@nimbus/shared-types';
import type { Cache } from 'cache-manager';
import { MockWeatherService } from './mock-weather.service';
import { OpenWeatherService } from './open-weather.service';
import {
  DASHBOARD_TTL_MS,
  GEOCODING_TTL_MS,
} from './weather.constants';
import type { IWeatherService } from './weather.tokens';

/**
 * WEATHER_SERVICE implementation: caches responses (dashboard 10 min keyed by
 * location+unitSystem, geocoding 6 hr keyed by query) and uses OpenWeather as
 * primary, falling back to the mock when no key is configured OR the upstream
 * call fails — so the API never 5xx's on a missing key.
 */
@Injectable()
export class WeatherService implements IWeatherService {
  private readonly logger = new Logger(WeatherService.name);

  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly openWeather: OpenWeatherService,
    private readonly mock: MockWeatherService,
  ) {}

  async getDashboard(
    location: string,
    unitSystem: UnitSystem,
    userId: string,
  ): Promise<WeatherDashboard> {
    const key = `dashboard:${location}:${unitSystem}`;
    const cached = await this.cache.get<WeatherDashboard>(key);
    if (cached) {
      return cached;
    }

    const result = await this.resolve(
      (svc) => svc.getDashboard(location, unitSystem, userId),
      'getDashboard',
    );
    await this.cache.set(key, result, DASHBOARD_TTL_MS);
    return result;
  }

  async searchLocations(query: string): Promise<LocationSuggestion[]> {
    const key = `geo:${query}`;
    const cached = await this.cache.get<LocationSuggestion[]>(key);
    if (cached) {
      return cached;
    }

    const result = await this.resolve(
      (svc) => svc.searchLocations(query),
      'searchLocations',
    );
    await this.cache.set(key, result, GEOCODING_TTL_MS);
    return result;
  }

  /**
   * Run `op` against OpenWeather when a key is configured; on a missing key or
   * any upstream error, fall back to the mock provider.
   */
  private async resolve<T>(
    op: (svc: IWeatherService) => Promise<T>,
    label: string,
  ): Promise<T> {
    if (this.openWeather.hasApiKey()) {
      try {
        return await op(this.openWeather);
      } catch (error) {
        this.logger.warn(
          `OpenWeather ${label} failed; falling back to mock: ${
            error instanceof Error ? error.message : error
          }`,
        );
      }
    }
    return op(this.mock);
  }
}
