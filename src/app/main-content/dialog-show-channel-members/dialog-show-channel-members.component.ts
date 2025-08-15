import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { CloseButtonComponent } from '../../style-components/close-button/close-button.component';
import { UsersComponent } from '../../style-components/users/users.component';
import { User } from '../../userManagement/user.interface';

/**
 * Component for displaying the members of a channel.
 * Supports selecting a member, closing the dialog, and transferring to a member-adding dialog.
 */
@Component({
  selector: 'app-dialog-show-channel-members',
  standalone: true,
  imports: [CommonModule, CloseButtonComponent, UsersComponent],
  templateUrl: './dialog-show-channel-members.component.html',
  styleUrls: ['./../dialog-add-channel/dialog-add-channel.component.scss', './dialog-show-channel-members.component.scss']
})
export class DialogShowChannelMembersComponent implements OnChanges {
  @Input() users: User[] = [];
  @Input() selectedUserId: string | null = null;
  @Input() position: { top: number; left: number } = { top: 0, left: 0 };
  @Input() asOverlay: boolean = true;
  @Output() close = new EventEmitter<void>();
  @Output() openAddMembers = new EventEmitter<{ top: number; left: number }>();
  @Output() openAddMembersMobile = new EventEmitter<void>();
  @Output() userClicked = new EventEmitter<User>();

  selectedUser: User | null = null;

  /**
   * Lifecycle hook called when input properties change.
   * Updates the selected user if a matching ID is found.
   */
  ngOnChanges(): void {
    if (this.selectedUserId) {
      const user = this.users.find(u => u.id === this.selectedUserId);

      if (user && user.id !== this.selectedUser?.id) this.selectedUser = user;
    }
  }

  /**
   * Handles when a user is selected from the list.
   * 
   * @param user The user that was selected
   */
  onSelectUser(user: User) {
    this.selectedUser = user;
    this.userClicked.emit(user);
  }

  /**
   * Emits an event to close the dialog.
   */
  closeShowMembers() {
    this.close.emit();
  }

  /**
   * Closes the current dialog and emits an event to open the "add members" dialog,
   * passing the current dialog position.
   */
  transferAddMember() {
    if (this.asOverlay) {
      this.closeShowMembers();
      this.openAddMembers.emit(this.position);
    }
  }

  /**
   * Emits an event to open the "add members" view in mobile mode.
   */
  addMemberEditMobile() {
    this.openAddMembersMobile.emit();
  }
}