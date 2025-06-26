import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { SideNavComponent } from './side-nav/side-nav.component';

@Component({
  selector: 'app-main-content',
  standalone: true,
  imports: [CommonModule, SideNavComponent],
  templateUrl: './main-content.component.html',
  styleUrl: './main-content.component.scss'
})
export class MainContentComponent {

}
