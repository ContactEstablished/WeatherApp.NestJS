import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, filter, firstValueFrom, of, Subject, switchMap } from 'rxjs';
import type {
  LocationSuggestion,
  UnitSystem,
  WeatherDashboard,
} from '@nimbus/shared-types';
import { WeatherApiService } from './weather-api.service';

@Injectable({ providedIn: 'root' })
export class WeatherStore {
  private readonly api = inject(WeatherApiService);
  private readonly destroyRef = inject(DestroyRef);

  // --- Writable signals ---
  readonly dashboard = signal<WeatherDashboard | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly search = signal('San Francisco, CA');
  readonly unitSystem = signal<UnitSystem>('imperial');
  readonly suggestions = signal<LocationSuggestion[]>([]);
  readonly savedLocations = signal<LocationSuggestion[]>([]);
  readonly searchFocused = signal(false);
  readonly savingLocation = signal(false);
  readonly updatingLocationId = signal<number | null>(null);

  private readonly searchInput$ = new Subject<string>();

  constructor() {
    this.searchInput$
      .pipe(
        debounceTime(250),
        filter((v) => v.trim().length >= 2),
        switchMap((v) =>
          this.api.searchLocations(v).pipe(
            catchError(() => of([] as LocationSuggestion[])),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((results) => {
        this.suggestions.set(results);
      });
  }

  // --- Helpers ---
  locationLabel(location: LocationSuggestion): string {
    return [location.name, location.region].filter(Boolean).join(', ');
  }

  formatTime(value: string): string {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(value));
  }

  formatShortDate(value: string): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
    }).format(new Date(`${value}T12:00:00`));
  }

  private isSameLocation(first: LocationSuggestion, second: LocationSuggestion): boolean {
    return (
      first.name.toLowerCase() === second.name.toLowerCase() &&
      first.region.toLowerCase() === second.region.toLowerCase()
    );
  }

  // --- Computeds ---
  readonly activeLocation = computed(() => this.dashboard()?.locations[0] ?? null);

  readonly activeSavedLocation = computed(() => {
    const active = this.activeLocation();
    if (!active) {
      return null;
    }
    return this.savedLocations().find((loc) => this.isSameLocation(loc, active)) ?? null;
  });

  readonly showSuggestions = computed(
    () => this.searchFocused() && this.suggestions().length > 0,
  );

  readonly formattedObservedAt = computed(() => {
    if (!this.dashboard()) {
      return '';
    }
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(this.dashboard()!.current.observedAt));
  });

  // --- Read handlers ---
  async loadDashboard(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const result = await firstValueFrom(
        this.api.getWeatherDashboard(this.search(), this.unitSystem()),
      );
      this.dashboard.set(result);
      this.unitSystem.set(result.unitSystem);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Unable to load weather.');
    } finally {
      this.loading.set(false);
    }
  }

  async loadPreferences(): Promise<void> {
    try {
      const prefs = await firstValueFrom(this.api.getPreferences());
      this.unitSystem.set(prefs.unitSystem);
    } catch {
      this.unitSystem.set('imperial');
    }
  }

  async loadSavedLocations(): Promise<void> {
    try {
      const locs = await firstValueFrom(this.api.getSavedLocations());
      this.savedLocations.set(locs);
    } catch {
      this.savedLocations.set([]);
    }
  }

  // --- Write handlers ---
  async changeUnits(nextUnitSystem: UnitSystem): Promise<void> {
    if (this.unitSystem() === nextUnitSystem) {
      return;
    }
    this.unitSystem.set(nextUnitSystem);
    await firstValueFrom(this.api.updatePreferences(nextUnitSystem));
    await this.loadDashboard();
  }

  async chooseLocation(location: LocationSuggestion): Promise<void> {
    this.search.set(this.locationLabel(location));
    this.searchFocused.set(false);
    this.suggestions.set([]);
    await this.loadDashboard();
  }

  async saveActiveLocation(): Promise<void> {
    if (!this.activeLocation() || this.activeSavedLocation() || this.savingLocation()) {
      return;
    }
    this.savingLocation.set(true);
    try {
      const loc = this.activeLocation()!;
      await firstValueFrom(this.api.saveLocation(loc));
      await this.loadSavedLocations();
    } finally {
      this.savingLocation.set(false);
    }
  }

  async removeSavedLocation(location: LocationSuggestion): Promise<void> {
    if (!location.id || this.updatingLocationId()) {
      return;
    }
    this.updatingLocationId.set(location.id);
    try {
      await firstValueFrom(this.api.deleteSavedLocation(location.id));
      await this.loadSavedLocations();
    } finally {
      this.updatingLocationId.set(null);
    }
  }

  async makeDefaultLocation(location: LocationSuggestion): Promise<void> {
    if (!location.id || location.isDefault || this.updatingLocationId()) {
      return;
    }
    this.updatingLocationId.set(location.id);
    try {
      await firstValueFrom(this.api.setDefaultLocation(location.id));
      await this.loadSavedLocations();
    } finally {
      this.updatingLocationId.set(null);
    }
  }

  async moveSavedLocation(
    location: LocationSuggestion,
    index: number,
    direction: -1 | 1,
  ): Promise<void> {
    if (!location.id || this.updatingLocationId()) {
      return;
    }
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= this.savedLocations().length) {
      return;
    }
    const nextLocations = [...this.savedLocations()];
    [nextLocations[index], nextLocations[targetIndex]] = [
      nextLocations[targetIndex],
      nextLocations[index],
    ];
    const locationIds = nextLocations
      .map((loc) => loc.id)
      .filter((id): id is number => typeof id === 'number');

    this.updatingLocationId.set(location.id);
    this.savedLocations.set(nextLocations);
    try {
      await firstValueFrom(this.api.reorderSavedLocations(locationIds));
      await this.loadSavedLocations();
    } finally {
      this.updatingLocationId.set(null);
    }
  }

  // --- Search input ---
  onSearchInput(value: string): void {
    this.search.set(value);
    if (value.trim().length < 2) {
      this.suggestions.set([]);
    }
    this.searchInput$.next(value);
  }

  // --- Boot sequence (mirrors App.vue onMounted) ---
  async init(): Promise<void> {
    await this.loadPreferences();
    await this.loadSavedLocations();

    const defaultLocation =
      this.savedLocations().find((loc) => loc.isDefault) ?? this.savedLocations()[0];
    if (defaultLocation) {
      this.search.set(this.locationLabel(defaultLocation));
    }

    await this.loadDashboard();
  }
}
