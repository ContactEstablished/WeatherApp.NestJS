import { Component } from '@angular/core';
import { SearchBoxComponent } from './search-box.component';
import { UnitSwitchComponent } from './unit-switch.component';
import { ProfileClusterComponent } from './profile-cluster.component';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [SearchBoxComponent, UnitSwitchComponent, ProfileClusterComponent],
  templateUrl: './topbar.component.html',
})
export class TopbarComponent {}
