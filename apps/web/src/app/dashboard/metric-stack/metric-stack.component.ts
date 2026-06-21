import { Component, inject } from '@angular/core';
import { WeatherStore } from '../../core/weather.store';
import { MetricCardComponent } from '../../shared/metric-card/metric-card.component';

@Component({
  selector: 'app-metric-stack',
  standalone: true,
  imports: [MetricCardComponent],
  templateUrl: './metric-stack.component.html',
})
export class MetricStackComponent {
  protected store = inject(WeatherStore);
}
