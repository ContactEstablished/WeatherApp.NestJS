import { Component, inject } from '@angular/core';
import { LucideAngularModule, ShieldAlert, Zap } from 'lucide-angular';
import { WeatherStore } from '../core/weather.store';
import { HeroWeatherComponent } from './hero-weather/hero-weather.component';
import { PreviewRowComponent } from './preview-row/preview-row.component';
import { HourlyPanelComponent } from './hourly-panel/hourly-panel.component';
import { ForecastPanelComponent } from './forecast-panel/forecast-panel.component';
import { MetricStackComponent } from './metric-stack/metric-stack.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    HeroWeatherComponent,
    PreviewRowComponent,
    HourlyPanelComponent,
    ForecastPanelComponent,
    MetricStackComponent,
    LucideAngularModule,
  ],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent {
  protected store = inject(WeatherStore);
  readonly Zap = Zap;
  readonly ShieldAlert = ShieldAlert;
}
