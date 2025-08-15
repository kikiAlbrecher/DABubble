import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet } from '@angular/router';
import { IntroComponent } from "./intro/intro.component";
import { Router } from '@angular/router';
import { UserSharedService } from './userManagement/userManagement-service';
import { MainContentComponent } from './main-content/main-content.component';
import { HeaderSharedService } from './header/user-header/header-service';
import { UserDetailComponent } from "./userManagement/user-detail/user-detail.component";
import { MessageSharedService } from './main-content/message-service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule,
    RouterModule,
    RouterOutlet,
    IntroComponent,
    MainContentComponent,
    UserDetailComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'DABubble';
  showIntro = true;
  hasPlayedIntro = false;

  constructor(
    public router: Router,
    public sharedUser: UserSharedService,
    public sharedHeader: HeaderSharedService,
    public sharedMessages: MessageSharedService
  ) { this.sharedUser.initAuth(); }

  /**
   * Angular lifecycle hook - called once the component is initialized.
   * 
   * Purpose:
   * - Checks if the user has already seen the intro (e.g., onboarding or tutorial screen).
   * - Uses localStorage to persist that state across sessions.
   * - Sets flags to determine whether to show the intro on first visit.
   */
  ngOnInit() {
    const introShown = localStorage.getItem('introShown');
    this.showIntro = introShown !== 'true';
    this.hasPlayedIntro = this.showIntro;
  }

  /**
   * Triggered when the intro sequence has been completed by the user.
   * 
   * Purpose:
   * - Hides the intro UI.
   * - Saves a flag in localStorage to ensure the intro does not show again on future visits.
   */
  onIntroDone() {
    this.showIntro = false;
    localStorage.setItem('introShown', 'true');
  }
}