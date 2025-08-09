import { Component, Input } from '@angular/core';
import { User } from '../../userManagement/user.interface';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-user-image-status',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-image-status.component.html',
  styleUrl: './user-image-status.component.scss'
})
export class UserImageStatusComponent {
  public _user!: User;

  /**
   * Sets the user input for this component.
   * Used to display user-related data (e.g. avatar, status).
   *
   * @param value - The user object to assign.
   */
  @Input()
  set user(value: User) {
    this._user = value;
  }

  /**
   * Gets the current user object.
   *
   * @returns The assigned user.
   */
  get user(): User {
    return this._user;
  }
}