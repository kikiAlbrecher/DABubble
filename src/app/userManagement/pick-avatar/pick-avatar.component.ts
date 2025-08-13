/**
 * PickAvatarComponent
 * --------------------
 * This component allows the user to select an avatar image during the registration or onboarding process.
 * The selected image is stored in the UserSharedService and submitted along with other user details.
 *
 * If no image is selected upon submission, an error flag is triggered to inform the user.
 * Upon successful selection and submission, the user is redirected to the login page.
 *
 */

import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { UserSharedService } from '../userManagement-service';

@Component({
  selector: 'app-pick-avatar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
  ],
  templateUrl: './pick-avatar.component.html',
  styleUrl: './pick-avatar.component.scss'
})
export class PickAvatarComponent {
  constructor(
    public shared: UserSharedService,
    private router: Router) { }

  avatarImg: string = 'assets/img/avatar-placeholder.svg';
  picturePicked: boolean = false;
  noPicturePicked: boolean = false;

  /**
   * List of avatar image paths available for selection.
   */
  images = [
    'assets/img/avatar1.svg',
    'assets/img/avatar2.svg',
    'assets/img/avatar3.svg',
    'assets/img/avatar4.svg',
    'assets/img/avatar5.svg',
    'assets/img/avatar6.svg',
  ];

  /**
   * Sets the selected image as the user's avatar.
   * Also toggles the picturePicked flag for UI feedback.
   * @param item - Path to the selected avatar image
   */
  setImage(item: string) {
    this.avatarImg = item;
    this.picturePicked = true;
  }

  /**
   * Submits the selected avatar to the shared user service.
   * Navigates the user to the login page if successful.
   * If no image is selected, sets an error flag for the UI.
   */
  onSubmit() {
    if (this.picturePicked) {
      this.shared.userDetails.picture = this.avatarImg ?? '';
      this.shared.submitUser()
      this.router.navigate(['/login']);
    } else {
      this.noPicturePicked = true;
    }
  }
}