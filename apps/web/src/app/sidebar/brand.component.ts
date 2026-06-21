import { Component } from '@angular/core';
import { LucideAngularModule, CloudLightning } from 'lucide-angular';

@Component({
  selector: 'app-brand',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './brand.component.html',
})
export class BrandComponent {
  readonly CloudLightning = CloudLightning;
}
