import { Component } from '@angular/core';
import { LucideAngularModule, Moon } from 'lucide-angular';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './theme-toggle.component.html',
})
export class ThemeToggleComponent {
  readonly Moon = Moon;
}
