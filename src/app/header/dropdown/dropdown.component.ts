import { Component } from '@angular/core';
import { HeaderSharedService } from '../user-header/header-service';
import { UserSharedService } from '../../userManagement/userManagement-service';

@Component({
  selector: 'app-dropdown',
  standalone: true,
  imports: [],
  templateUrl: './dropdown.component.html',
  styleUrl: './dropdown.component.scss'
})
export class DropdownComponent {
  constructor(
    public sharedUser: UserSharedService,
    public sharedHeader: HeaderSharedService,
  ) { }

  /**
   * Opens the current user's profile by setting the selected user 
   * and triggering the profile view through the shared header service.
   */
  openProfile() {
    this.sharedUser.setSelectedUser(this.sharedUser.actualUser);
    this.sharedHeader.requestProfileOpen();
  }
}