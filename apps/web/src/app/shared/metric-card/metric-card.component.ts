import { Component, computed, input } from '@angular/core';
import { LucideAngularModule, Droplet, Eye, Umbrella, Wind } from 'lucide-angular';
import type { WeatherMetric } from '@nimbus/shared-types';
import { SparklineComponent } from '../sparkline/sparkline.component';

@Component({
  selector: 'app-metric-card',
  standalone: true,
  imports: [LucideAngularModule, SparklineComponent],
  templateUrl: './metric-card.component.html',
})
export class MetricCardComponent {
  metric = input.required<WeatherMetric>();

  readonly Droplet = Droplet;
  readonly Eye = Eye;
  readonly Umbrella = Umbrella;
  readonly Wind = Wind;

  icon = computed(() => {
    switch (this.metric().key) {
      case 'humidity':      return Droplet;
      case 'wind':          return Wind;
      case 'precipitation': return Umbrella;
      default:              return Eye;
    }
  });

  sparklineVariant = computed((): 'bars' | 'line' =>
    this.metric().key === 'precipitation' ? 'bars' : 'line'
  );
}
