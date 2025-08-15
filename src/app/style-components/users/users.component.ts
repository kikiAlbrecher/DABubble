import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { User } from '../../userManagement/user.interface';
import { UserImageStatusComponent } from '../user-image-status/user-image-status.component';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, UserImageStatusComponent],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss'
})
export class UsersComponent {
  @Input() users: User[] = [];
  @Input() selectedUserId: string | null = null;
  @Input() stopClickPropagation: boolean = false;
  @Output() userSelected = new EventEmitter<User>();

  /**
   * Handles user selection. Optionally stops event propagation if configured.
   *
   * @param user - The selected user.
   * @param event - The optional mouse event triggered on click.
   */
  onSelectUser(user: User, event?: MouseEvent) {
    if (this.stopClickPropagation && event) {
      event.stopPropagation();
    }

    this.userSelected.emit(user);
  }

  /**
   * Tracking function used by Angular's `*ngFor` directive to optimize rendering.
   * 
   * Returns a unique identifier for each user, which helps Angular track items in a list efficiently.
   * If the user has an `id`, it is used as the tracking key. Otherwise, the index is used as a fallback.
   * 
   * @param {number} index - The index of the item in the iterable.
   * @param {User} user - The user object for the current item.
   * @returns {string} A unique identifier for tracking the user.
   */
  trackByUser(index: number, user: User): string {
    return user.id ?? index.toString();
  }
}