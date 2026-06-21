import { Component, inject } from '@angular/core';
import { WeatherStore } from '../core/weather.store';
import { BrandComponent } from './brand.component';
import { NavListComponent } from './nav-list.component';
import { SavedLocationsComponent } from './saved-locations.component';
import { PremiumCardComponent } from './premium-card.component';
import { ThemeToggleComponent } from './theme-toggle.component';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    BrandComponent,
    NavListComponent,
    SavedLocationsComponent,
    PremiumCardComponent,
    ThemeToggleComponent,
  ],
  templateUrl: './sidebar.component.html',
})
export class SidebarComponent {
  readonly store = inject(WeatherStore);
}
