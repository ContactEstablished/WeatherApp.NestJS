import { Component, inject } from '@angular/core';
import { LucideAngularModule, MapPin, Search } from 'lucide-angular';
import { WeatherStore } from '../../core/weather.store';

@Component({
  selector: 'app-search-box',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './search-box.component.html',
})
export class SearchBoxComponent {
  protected store = inject(WeatherStore);
  readonly Search = Search;
  readonly MapPin = MapPin;
}
