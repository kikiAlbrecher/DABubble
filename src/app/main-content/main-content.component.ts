import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { SideNavComponent } from './side-nav/side-nav.component';
import { Router } from '@angular/router';
import { LogoComponent } from '../logo/logo.component';
import { UserSharedService } from '../userManagement/userManagement-service';
import { getAuth, } from "firebase/auth";

@Component({
  selector: 'app-main-content',
  standalone: true,
  imports: [CommonModule, SideNavComponent, LogoComponent],
  templateUrl: './main-content.component.html',
  styleUrl: './main-content.component.scss'
})
export class MainContentComponent {
  constructor(
        public shared: UserSharedService,
        private router: Router,
        ) { console.log(shared.actualUser);
         }   
}



