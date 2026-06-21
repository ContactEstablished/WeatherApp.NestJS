import { Component, OnInit, inject } from '@angular/core';
import { WeatherStore } from './core/weather.store';
import { SidebarComponent } from './sidebar/sidebar.component';
import { TopbarComponent } from './features/topbar/topbar.component';

@Component({
  imports: [SidebarComponent, TopbarComponent],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  readonly store = inject(WeatherStore);

  ngOnInit(): void {
    this.store.init();
  }
}
