import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  DailyForecast,
  HourlyForecast,
  LocationSuggestion,
  UnitSystem,
  WeatherDashboard,
  WeatherMetric,
  WeatherPreview,
} from '@nimbus/shared-types';
import {
  backgroundFor,
  resolveUnits,
  US_STATE_NAMES,
} from './weather.constants';
import type { IWeatherService } from './weather.tokens';

/** Minimal shapes for the OpenWeather responses we consume. */
interface GeoResult {
  name: string;
  lat: number;
  lon: number;
  country: string;
  state?: string;
}

interface OneCallWeather {
  id: number;
  main: string;
  description: string;
}

interface OneCallResponse {
  timezone_offset: number;
  current: {
    dt: number;
    sunrise: number;
    sunset: number;
    temp: number;
    feels_like: number;
    humidity: number;
    wind_speed: number;
    visibility: number;
    weather: OneCallWeather[];
  };
  hourly: Array<{
    dt: number;
    temp: number;
    humidity: number;
    wind_speed: number;
    pop: number;
    weather: OneCallWeather[];
  }>;
  daily: Array<{
    dt: number;
    summary?: string;
    temp: { min: number; max: number; day: number };
    pop: number;
    weather: OneCallWeather[];
  }>;
}

const ZIP5 = /^\d{5}$/;
const ZIP9 = /^\d{5}-\d{4}$/;

/**
 * Primary weather provider — OpenWeather One Call 3.0 + Geocoding, via the
 * Node 22 global `fetch`. Throws when no key is configured or the upstream
 * call fails; the WeatherModule facade then falls back to MockWeatherService.
 */
@Injectable()
export class OpenWeatherService implements IWeatherService {
  private readonly logger = new Logger(OpenWeatherService.name);

  constructor(private readonly config: ConfigService) {}

  private get apiKey(): string {
    return (this.config.get<string>('OPENWEATHER_API_KEY') ?? '').trim();
  }

  private get baseUrl(): string {
    return (
      this.config.get<string>('OPENWEATHER_BASE_URL') ??
      'https://api.openweathermap.org'
    ).replace(/\/$/, '');
  }

  hasApiKey(): boolean {
    return this.apiKey.length > 0;
  }

  async getDashboard(
    location: string,
    unitSystem: UnitSystem,
  ): Promise<WeatherDashboard> {
    const matches = await this.geocode(location);
    const place = matches[0];
    if (!place) {
      throw new Error(`No geocoding result for "${location}"`);
    }

    const units = resolveUnits(unitSystem);
    const data = await this.fetchJson<OneCallResponse>(
      `${this.baseUrl}/data/3.0/onecall?lat=${place.lat}&lon=${place.lon}` +
        `&exclude=minutely&units=${units.units}&appid=${this.apiKey}`,
    );

    const offset = data.timezone_offset ?? 0;
    const displayName = this.displayName(place);

    const hourly: HourlyForecast[] = data.hourly.slice(0, 7).map((h, i) => ({
      label: i === 0 ? 'Now' : this.hourLabel(h.dt, offset),
      time: this.isoLocal(h.dt, offset),
      condition: h.weather[0]?.main ?? 'Clear',
      temperature: Math.round(h.temp),
      windSpeed: this.round1(h.wind_speed),
      precipitationChance: Math.round((h.pop ?? 0) * 100),
    }));

    const daily: DailyForecast[] = data.daily.slice(0, 5).map((d) => ({
      day: this.weekday(d.dt, offset),
      date: this.dateLabel(d.dt, offset),
      condition: d.weather[0]?.main ?? 'Clear',
      high: Math.round(d.temp.max),
      low: Math.round(d.temp.min),
      precipitationChance: Math.round((d.pop ?? 0) * 100),
    }));

    const previews: WeatherPreview[] = data.daily.slice(0, 3).map((d) => ({
      condition: d.weather[0]?.main ?? 'Clear',
      high: Math.round(d.temp.max),
      low: Math.round(d.temp.min),
      description: d.summary ?? d.weather[0]?.description ?? '',
    }));

    const current = data.current;
    const condition = current.weather[0]?.main ?? 'Clear';
    const metrics = this.buildMetrics(data, units, unitSystem);

    return {
      current: {
        location: displayName,
        observedAt: this.clock(current.dt, offset),
        condition,
        summary: current.weather[0]?.main ?? condition,
        description: current.weather[0]?.description ?? '',
        temperature: Math.round(current.temp),
        feelsLike: Math.round(current.feels_like),
        low: Math.round(data.daily[0]?.temp.min ?? current.temp),
        high: Math.round(data.daily[0]?.temp.max ?? current.temp),
        sunrise: this.clock(current.sunrise, offset),
        sunset: this.clock(current.sunset, offset),
        backgroundImageUrl: backgroundFor(condition),
      },
      hourly,
      daily,
      previews,
      metrics,
      locations: matches.map((m) => this.toSuggestion(m)),
      unitSystem,
      temperatureUnit: units.temperatureUnit,
      windUnit: units.windUnit,
    };
  }

  async searchLocations(query: string): Promise<LocationSuggestion[]> {
    const matches = await this.geocode(query);
    return matches.map((m) => this.toSuggestion(m));
  }

  // --- geocoding ----------------------------------------------------------

  private async geocode(input: string): Promise<GeoResult[]> {
    const query = (input ?? '').trim();
    if (ZIP5.test(query) || ZIP9.test(query)) {
      const zip = query.slice(0, 5);
      const result = await this.fetchJson<GeoResult>(
        `${this.baseUrl}/geo/1.0/zip?zip=${zip},US&appid=${this.apiKey}`,
      );
      return [result];
    }

    const q = this.normalizeQuery(query);
    const results = await this.fetchJson<GeoResult[]>(
      `${this.baseUrl}/geo/1.0/direct?q=${encodeURIComponent(q)}&limit=5` +
        `&appid=${this.apiKey}`,
    );
    return Array.isArray(results) ? results : [];
  }

  /**
   * Normalize `"San Francisco, CA"` → `"San Francisco,CA,US"` so the
   * OpenWeather direct geocoder receives a US state + country code.
   */
  private normalizeQuery(query: string): string {
    const parts = query.split(',').map((p) => p.trim());
    if (parts.length === 2) {
      const [city, region] = parts;
      const code = region.toUpperCase();
      if (US_STATE_NAMES[code]) {
        return `${city},${code},US`;
      }
    }
    return query;
  }

  private toSuggestion(m: GeoResult): LocationSuggestion {
    return {
      name: m.name,
      region: this.regionName(m.state),
      country: m.country,
      latitude: m.lat,
      longitude: m.lon,
      id: null,
      isDefault: false,
      sortOrder: 0,
    };
  }

  private regionName(state?: string): string {
    if (!state) return '';
    const code = state.toUpperCase();
    return US_STATE_NAMES[code] ?? state;
  }

  private displayName(place: GeoResult): string {
    const region = this.regionName(place.state);
    return region ? `${place.name}, ${region}` : place.name;
  }

  // --- metrics ------------------------------------------------------------

  private buildMetrics(
    data: OneCallResponse,
    units: ReturnType<typeof resolveUnits>,
    unitSystem: UnitSystem,
  ): WeatherMetric[] {
    const next = data.hourly.slice(0, 6);
    const visibilityValue =
      unitSystem === 'metric'
        ? Math.round(data.current.visibility / 1000)
        : Math.round(data.current.visibility / 1609);
    return [
      {
        key: 'humidity',
        label: 'Humidity',
        value: `${Math.round(data.current.humidity)}`,
        unit: '%',
        hint: this.humidityHint(data.current.humidity),
        trend: next.map((h) => Math.round(h.humidity)),
      },
      {
        key: 'wind',
        label: 'Wind',
        value: `${this.round1(data.current.wind_speed)}`,
        unit: units.windUnit,
        hint: 'Current wind speed',
        trend: next.map((h) => this.round1(h.wind_speed)),
      },
      {
        key: 'precipitation',
        label: 'Precipitation',
        value: `${Math.round((data.hourly[0]?.pop ?? 0) * 100)}`,
        unit: '%',
        hint: 'Chance over the next hour',
        trend: next.map((h) => Math.round((h.pop ?? 0) * 100)),
      },
      {
        key: 'visibility',
        label: 'Visibility',
        value: `${visibilityValue}`,
        unit: unitSystem === 'metric' ? 'km' : 'mi',
        hint: 'How far you can see',
        trend: next.map(() => visibilityValue),
      },
    ];
  }

  private humidityHint(humidity: number): string {
    if (humidity >= 70) return 'Humid';
    if (humidity <= 30) return 'Dry';
    return 'Comfortable';
  }

  // --- time helpers (timezone-offset aware) -------------------------------

  /** Shift a UTC unix second by the location's offset and read as UTC. */
  private shifted(dtSeconds: number, offsetSeconds: number): Date {
    return new Date((dtSeconds + offsetSeconds) * 1000);
  }

  private clock(dtSeconds: number, offset: number): string {
    const d = this.shifted(dtSeconds, offset);
    return this.formatClock(d.getUTCHours(), d.getUTCMinutes());
  }

  private hourLabel(dtSeconds: number, offset: number): string {
    const d = this.shifted(dtSeconds, offset);
    const h = d.getUTCHours();
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12} ${period}`;
  }

  private formatClock(hours: number, minutes: number): string {
    const period = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 === 0 ? 12 : hours % 12;
    return `${hour12}:${String(minutes).padStart(2, '0')} ${period}`;
  }

  private weekday(dtSeconds: number, offset: number): string {
    const d = this.shifted(dtSeconds, offset);
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getUTCDay()];
  }

  private dateLabel(dtSeconds: number, offset: number): string {
    const d = this.shifted(dtSeconds, offset);
    const month = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ][d.getUTCMonth()];
    return `${month} ${d.getUTCDate()}`;
  }

  private isoLocal(dtSeconds: number, offset: number): string {
    return this.shifted(dtSeconds, offset).toISOString();
  }

  private round1(n: number): number {
    return Math.round(n * 10) / 10;
  }

  // --- http ---------------------------------------------------------------

  private async fetchJson<T>(url: string): Promise<T> {
    const response = await fetch(url);
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      this.logger.warn(
        `OpenWeather request failed (${response.status}): ${body.slice(0, 200)}`,
      );
      throw new Error(`OpenWeather request failed with ${response.status}`);
    }
    return (await response.json()) as T;
  }
}
