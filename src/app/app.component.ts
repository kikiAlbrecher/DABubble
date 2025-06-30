import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet } from '@angular/router';
import { IntroComponent } from "./intro/intro.component";
import { Router } from '@angular/router';
import { UserSharedService } from './userManagement/userManagement-service';
import { MainContentComponent } from './main-content/main-content.component';
import { HeaderSharedService } from './header/user-header/header-service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule,
    RouterModule,
    RouterOutlet,
    IntroComponent,
    MainContentComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'DABubble';
    showIntro = true;

  constructor(
    public router: Router,
    public sharedUser: UserSharedService,
    public sharedHeader: HeaderSharedService,
  ) { this.sharedUser.initAuth();}
}
