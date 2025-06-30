import { Component } from '@angular/core';
import { UserSharedService } from '../../userManagement/userManagement-service';
import { RouterModule, RouterOutlet, Router } from '@angular/router';
import { HeaderSharedService } from './header-service';
import { DropdownComponent } from "../dropdown/dropdown.component";
import { UserProfileComponent } from "../user-profile/user-profile.component";


@Component({
  selector: 'app-user-header',
  standalone: true,
  imports: [
    DropdownComponent,
    UserProfileComponent
],
  templateUrl: './user-header.component.html',
  styleUrl: './user-header.component.scss'
})

export class UserHeaderComponent {
  constructor(
    public shared: UserSharedService,
    public sharedHeader: HeaderSharedService,
    private router: Router) {}

    userEditOverlay: boolean = false;  

    showUserEdit() {
        this.userEditOverlay = !this.userEditOverlay 
    }

}
