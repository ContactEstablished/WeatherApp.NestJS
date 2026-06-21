import { Component, inject } from '@angular/core';
import { WeatherStore } from '../../core/weather.store';
import { WeatherIconComponent } from '../../shared/weather-icon/weather-icon.component';

@Component({
  selector: 'app-hourly-panel',
  standalone: true,
  imports: [WeatherIconComponent],
  templateUrl: './hourly-panel.component.html',
})
export class HourlyPanelComponent {
  protected store = inject(WeatherStore);
}
