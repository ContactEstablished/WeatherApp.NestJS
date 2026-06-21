import { Component, inject } from '@angular/core';
import { WeatherStore } from '../../core/weather.store';

@Component({
  selector: 'app-unit-switch',
  standalone: true,
  templateUrl: './unit-switch.component.html',
})
export class UnitSwitchComponent {
  protected store = inject(WeatherStore);
}
