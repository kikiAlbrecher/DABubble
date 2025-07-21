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

  ngOnInit() {
    const introShown = localStorage.getItem('introShown');
    this.showIntro = introShown !== 'true';
    this.hasPlayedIntro = this.showIntro;
  }

  onIntroDone() {
    this.showIntro = false;
    localStorage.setItem('introShown', 'true');
  }

  
}


