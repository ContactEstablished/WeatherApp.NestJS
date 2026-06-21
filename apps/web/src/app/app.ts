import { Component, OnInit, inject } from '@angular/core';
import { WeatherStore } from './core/weather.store';
import { SidebarComponent } from './sidebar/sidebar.component';

@Component({
  imports: [SidebarComponent],
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
