import { Controller, Get, Inject, Query } from '@nestjs/common';
import type {
  LocationSuggestion,
  UnitSystem,
  WeatherDashboard,
} from '@nimbus/shared-types';
import { IWeatherService, WEATHER_SERVICE } from './weather.tokens';

/**
 * Endpoints #2 and #3 — the read-only weather half of the §0.2 contract.
 * Resolves under the global `api` prefix at `/api/weather/...`.
 */
@Controller('weather')
export class WeatherController {
  constructor(
    @Inject(WEATHER_SERVICE) private readonly weather: IWeatherService,
  ) {}

  /** Endpoint #2 — GET /api/weather/dashboard */
  @Get('dashboard')
  getDashboard(
    @Query('location') location: string,
    @Query('unitSystem') unitSystem: UnitSystem,
    @Query('userId') userId: string,
  ): Promise<WeatherDashboard> {
    const resolvedLocation = location ?? 'San Francisco';
    const resolvedUnits: UnitSystem =
      unitSystem === 'metric' ? 'metric' : 'imperial';
    return this.weather.getDashboard(
      resolvedLocation,
      resolvedUnits,
      userId ?? 'anonymous',
    );
  }

  /** Endpoint #3 — GET /api/weather/locations */
  @Get('locations')
  searchLocations(
    @Query('query') query?: string,
  ): Promise<LocationSuggestion[]> {
    return this.weather.searchLocations(query?.trim() || 'San Francisco');
  }
}
