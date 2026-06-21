import { Component, computed, input } from '@angular/core';
import { LucideAngularModule, Cloud, CloudRain, CloudSun, Moon, Sun } from 'lucide-angular';

@Component({
  selector: 'app-weather-icon',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './weather-icon.component.html',
})
export class WeatherIconComponent {
  condition = input.required<string>();
  size = input<'sm' | 'md' | 'lg' | 'xl'>('md');

  readonly Cloud = Cloud;
  readonly CloudRain = CloudRain;
  readonly CloudSun = CloudSun;
  readonly Moon = Moon;
  readonly Sun = Sun;

  icon = computed(() => {
    const c = this.condition().toLowerCase();
    if (c.includes('rain')) return CloudRain;
    if (c.includes('cloud') && c.includes('partly')) return CloudSun;
    if (c.includes('cloud')) return Cloud;
    if (c.includes('night') || c.includes('clear')) return Moon;
    return Sun;
  });

  conditionKebab = computed(() =>
    this.condition().toLowerCase().split(' ').join('-')
  );
}
