import { Component } from '@angular/core';
import { Gem, LucideAngularModule, Navigation } from 'lucide-angular';

@Component({
  selector: 'app-premium-card',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './premium-card.component.html',
})
export class PremiumCardComponent {
  readonly Gem = Gem;
  readonly Navigation = Navigation;
}
