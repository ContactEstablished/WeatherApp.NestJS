import { Component, inject } from '@angular/core';
import { NgClass } from '@angular/common';
import {
  ArrowDown,
  ArrowUp,
  LucideAngularModule,
  MapPin,
  Star,
  Trash2,
} from 'lucide-angular';
import { WeatherStore } from '../core/weather.store';

@Component({
  selector: 'app-saved-locations',
  standalone: true,
  imports: [NgClass, LucideAngularModule],
  templateUrl: './saved-locations.component.html',
})
export class SavedLocationsComponent {
  readonly store = inject(WeatherStore);
  readonly ArrowUp = ArrowUp;
  readonly ArrowDown = ArrowDown;
  readonly MapPin = MapPin;
  readonly Star = Star;
  readonly Trash2 = Trash2;

}
