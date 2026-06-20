export interface WeatherDashboard {
  current: CurrentWeather;
  hourly: HourlyForecast[];
  daily: DailyForecast[];
  previews: WeatherPreview[];
  metrics: WeatherMetric[];
  locations: LocationSuggestion[];
  unitSystem: UnitSystem;
  temperatureUnit: string;
  windUnit: string;
}

export interface CurrentWeather {
  location: string;
  observedAt: string;
  condition: string;
  summary: string;
  description: string;
  temperature: number;
  feelsLike: number;
  low: number;
  high: number;
  sunrise: string;
  sunset: string;
  backgroundImageUrl: string;
}

export interface HourlyForecast {
  label: string;
  time: string;
  condition: string;
  temperature: number;
  windSpeed: number;
  precipitationChance: number;
}

export interface DailyForecast {
  day: string;
  date: string;
  condition: string;
  high: number;
  low: number;
  precipitationChance: number;
}

export interface WeatherPreview {
  condition: string;
  high: number;
  low: number;
  description: string;
}

export interface WeatherMetric {
  key: string;
  label: string;
  value: string;
  unit: string;
  hint: string;
  trend: number[];
}

export interface LocationSuggestion {
  name: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
  id?: number | null;
  isDefault: boolean;
  sortOrder: number;
}

export type UnitSystem = 'imperial' | 'metric';

export interface UserPreferences {
  userId: string;
  unitSystem: UnitSystem;
}
