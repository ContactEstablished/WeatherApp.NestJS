import { Component, inject } from '@angular/core';
import { WeatherStore } from '../../core/weather.store';
import { WeatherIconComponent } from '../../shared/weather-icon/weather-icon.component';

@Component({
  selector: 'app-preview-row',
  standalone: true,
  imports: [WeatherIconComponent],
  templateUrl: './preview-row.component.html',
})
export class PreviewRowComponent {
  protected store = inject(WeatherStore);
}
