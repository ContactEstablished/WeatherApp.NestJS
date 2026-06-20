import { Injectable } from '@nestjs/common';
import type {
  DailyForecast,
  HourlyForecast,
  LocationSuggestion,
  UnitSystem,
  WeatherDashboard,
  WeatherMetric,
  WeatherPreview,
} from '@nimbus/shared-types';
import { backgroundFor, resolveUnits } from './weather.constants';
import type { IWeatherService } from './weather.tokens';

const HOUR_LABELS = ['Now', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM', '6 PM'];
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const CONDITIONS = ['Clear', 'Clouds', 'Rain', 'Clear', 'Clouds'];

/**
 * Deterministic, key-less, network-free fallback. Produces a fully-shaped
 * WeatherDashboard and a non-empty LocationSuggestion[] so the app serves the
 * §0.2 contract out of the box when no OPENWEATHER_API_KEY is configured.
 */
@Injectable()
export class MockWeatherService implements IWeatherService {
  async getDashboard(
    location: string,
    unitSystem: UnitSystem,
  ): Promise<WeatherDashboard> {
    const { temperatureUnit, windUnit } = resolveUnits(unitSystem);
    const metric = unitSystem === 'metric';
    // Base temperature differs by unit system so values look sensible either way.
    const base = metric ? 21 : 70;

    const hourly: HourlyForecast[] = HOUR_LABELS.map((label, i) => ({
      label,
      time: `${(13 + i) % 24}:00`,
      condition: CONDITIONS[i % CONDITIONS.length],
      temperature: base + i,
      windSpeed: metric ? 3 + i * 0.4 : 6 + i,
      precipitationChance: (i * 7) % 100,
    }));

    const daily: DailyForecast[] = DAY_NAMES.map((day, i) => ({
      day,
      date: this.dateLabel(i),
      condition: CONDITIONS[i % CONDITIONS.length],
      high: base + 6 + i,
      low: base - 6 + i,
      precipitationChance: (i * 15) % 100,
    }));

    const previews: WeatherPreview[] = [
      {
        condition: 'Clear',
        high: base + 6,
        low: base - 5,
        description: 'Sunny with a light breeze through the afternoon.',
      },
      {
        condition: 'Clouds',
        high: base + 4,
        low: base - 6,
        description: 'Increasing clouds with mild temperatures.',
      },
      {
        condition: 'Rain',
        high: base + 2,
        low: base - 7,
        description: 'Scattered showers likely in the evening.',
      },
    ];

    const metrics: WeatherMetric[] = [
      {
        key: 'humidity',
        label: 'Humidity',
        value: '62',
        unit: '%',
        hint: 'Comfortable',
        trend: [58, 60, 62, 64, 63, 61],
      },
      {
        key: 'wind',
        label: 'Wind',
        value: metric ? '4' : '9',
        unit: windUnit,
        hint: 'Light breeze',
        trend: metric ? [3, 4, 4, 5, 4, 3] : [6, 8, 9, 11, 9, 7],
      },
      {
        key: 'precipitation',
        label: 'Precipitation',
        value: '18',
        unit: '%',
        hint: 'Low chance',
        trend: [10, 14, 18, 22, 19, 15],
      },
      {
        key: 'visibility',
        label: 'Visibility',
        value: metric ? '16' : '10',
        unit: metric ? 'km' : 'mi',
        hint: 'Clear',
        trend: metric ? [14, 15, 16, 16, 15, 16] : [9, 10, 10, 10, 9, 10],
      },
    ];

    const condition = 'Clear';
    return {
      current: {
        location: location || 'San Francisco, California',
        observedAt: '12:00 PM',
        condition,
        summary: 'Clear skies',
        description: 'Clear skies and comfortable temperatures.',
        temperature: base,
        feelsLike: base - 1,
        low: base - 6,
        high: base + 6,
        sunrise: '6:24 AM',
        sunset: '7:58 PM',
        backgroundImageUrl: backgroundFor(condition),
      },
      hourly,
      daily,
      previews,
      metrics,
      locations: await this.searchLocations(location || 'San Francisco'),
      unitSystem,
      temperatureUnit,
      windUnit,
    };
  }

  async searchLocations(query: string): Promise<LocationSuggestion[]> {
    const q = (query || 'San Francisco').trim();
    return [
      {
        name: q,
        region: 'California',
        country: 'US',
        latitude: 37.7749,
        longitude: -122.4194,
        id: null,
        isDefault: false,
        sortOrder: 0,
      },
      {
        name: `${q} Heights`,
        region: 'California',
        country: 'US',
        latitude: 37.7899,
        longitude: -122.4014,
        id: null,
        isDefault: false,
        sortOrder: 0,
      },
    ];
  }

  private dateLabel(offsetDays: number): string {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}
