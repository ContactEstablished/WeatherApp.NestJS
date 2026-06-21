import { Component } from '@angular/core';
import { NgClass } from '@angular/common';
import {
  Bell,
  CalendarDays,
  Home,
  LocateFixed,
  LucideAngularModule,
  Map,
  MapPin,
  Settings,
} from 'lucide-angular';

@Component({
  selector: 'app-nav-list',
  standalone: true,
  imports: [NgClass, LucideAngularModule],
  templateUrl: './nav-list.component.html',
})
export class NavListComponent {
  readonly navItems = [
    { label: 'Overview', icon: Home, active: true },
    { label: 'Forecast', icon: CalendarDays },
    { label: 'Maps', icon: Map },
    { label: 'Radar', icon: LocateFixed },
    { label: 'Locations', icon: MapPin },
    { label: 'Alerts', icon: Bell },
    { label: 'Settings', icon: Settings },
  ];
}
