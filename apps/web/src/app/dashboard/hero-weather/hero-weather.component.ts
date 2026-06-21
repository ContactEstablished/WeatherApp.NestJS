import { Component, inject } from '@angular/core';
import { LucideAngularModule, Moon, Plus, Star, Sun, Thermometer, Zap } from 'lucide-angular';
import { WeatherStore } from '../../core/weather.store';
import { WeatherIconComponent } from '../../shared/weather-icon/weather-icon.component';

@Component({
  selector: 'app-hero-weather',
  standalone: true,
  imports: [WeatherIconComponent, LucideAngularModule],
  templateUrl: './hero-weather.component.html',
})
export class HeroWeatherComponent {
  protected store = inject(WeatherStore);
  readonly Zap = Zap;
  readonly Star = Star;
  readonly Plus = Plus;
  readonly Thermometer = Thermometer;
  readonly Sun = Sun;
  readonly Moon = Moon;
}
