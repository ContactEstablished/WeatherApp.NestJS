import type { UnitSystem } from '@nimbus/shared-types';

/** Resolved unit mapping for an OpenWeather request + the contract labels. */
export interface UnitConfig {
  /** OpenWeather `units` query value. */
  units: 'imperial' | 'metric';
  /** Contract `temperatureUnit` ('F' | 'C'). */
  temperatureUnit: string;
  /** Contract `windUnit` ('mph' | 'm/s'). */
  windUnit: string;
}

export function resolveUnits(unitSystem: UnitSystem): UnitConfig {
  return unitSystem === 'metric'
    ? { units: 'metric', temperatureUnit: 'C', windUnit: 'm/s' }
    : { units: 'imperial', temperatureUnit: 'F', windUnit: 'mph' };
}

/**
 * Condition → Unsplash background image. Keyed loosely off the OpenWeather
 * `weather[].main` text so both real and mock data resolve a non-empty URL.
 */
const BACKGROUNDS = {
  thunderstorm:
    'https://images.unsplash.com/photo-1605727216801-e27ce1d0cc28?auto=format&fit=crop&w=1600&q=80',
  rain: 'https://images.unsplash.com/photo-1428592953211-077101b2021b?auto=format&fit=crop&w=1600&q=80',
  snow: 'https://images.unsplash.com/photo-1491002052546-bf38f186af56?auto=format&fit=crop&w=1600&q=80',
  clouds:
    'https://images.unsplash.com/photo-1499956827185-0d63ee78a910?auto=format&fit=crop&w=1600&q=80',
  clear:
    'https://images.unsplash.com/photo-1601297183305-6df142704ea2?auto=format&fit=crop&w=1600&q=80',
  fog: 'https://images.unsplash.com/photo-1487621167305-5d248087c724?auto=format&fit=crop&w=1600&q=80',
} as const;

export const DEFAULT_BACKGROUND = BACKGROUNDS.clear;

export function backgroundFor(condition: string): string {
  const c = condition.toLowerCase();
  if (c.includes('thunder')) return BACKGROUNDS.thunderstorm;
  if (c.includes('drizzle') || c.includes('rain')) return BACKGROUNDS.rain;
  if (c.includes('snow') || c.includes('sleet')) return BACKGROUNDS.snow;
  if (c.includes('cloud')) return BACKGROUNDS.clouds;
  if (
    c.includes('mist') ||
    c.includes('fog') ||
    c.includes('haze') ||
    c.includes('smoke')
  ) {
    return BACKGROUNDS.fog;
  }
  if (c.includes('clear') || c.includes('sun')) return BACKGROUNDS.clear;
  return DEFAULT_BACKGROUND;
}

/**
 * US state abbreviation → full name. Used to normalize `"San Francisco, CA"`
 * style inputs for geocoding and to label the `region` in results.
 */
export const US_STATE_NAMES: Record<string, string> = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming',
  DC: 'District of Columbia',
};

/** Cache TTLs in milliseconds (RoadMap §0/§4). */
export const DASHBOARD_TTL_MS = 10 * 60 * 1000; // 10 minutes
export const GEOCODING_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
