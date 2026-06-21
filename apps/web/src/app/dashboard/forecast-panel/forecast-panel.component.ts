import { Component, inject } from '@angular/core';
import { Droplet, LucideAngularModule } from 'lucide-angular';
import { WeatherStore } from '../../core/weather.store';
import { WeatherIconComponent } from '../../shared/weather-icon/weather-icon.component';

@Component({
  selector: 'app-forecast-panel',
  standalone: true,
  imports: [WeatherIconComponent, LucideAngularModule],
  templateUrl: './forecast-panel.component.html',
})
export class ForecastPanelComponent {
  protected store = inject(WeatherStore);
  readonly Droplet = Droplet;

  rangeBarWidth(high: number): string {
    return `${Math.max(22, Math.min(86, high * 1.1))}px`;
  }
}
