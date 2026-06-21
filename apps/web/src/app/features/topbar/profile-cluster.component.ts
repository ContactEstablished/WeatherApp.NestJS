import { Component } from '@angular/core';
import { Bell, ChevronDown, LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-profile-cluster',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './profile-cluster.component.html',
})
export class ProfileClusterComponent {
  readonly Bell = Bell;
  readonly ChevronDown = ChevronDown;
}
