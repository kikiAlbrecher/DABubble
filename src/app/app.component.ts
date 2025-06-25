import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet } from '@angular/router';
import { IntroComponent } from "./intro/intro.component";
import { Router } from '@angular/router';
import { UserSharedService } from './userManagement/userManagement-service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, 
    RouterModule,
    RouterOutlet, 
    IntroComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'DABubble';

  constructor(
    public router: Router, 
    public sharedUser: UserSharedService
  ) {}

}
