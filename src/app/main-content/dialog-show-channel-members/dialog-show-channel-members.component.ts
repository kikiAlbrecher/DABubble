import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { CloseButtonComponent } from '../../style-components/close-button/close-button.component';
import { UsersComponent } from '../../style-components/users/users.component';
import { User } from '../../userManagement/user.interface';

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
  @Output() userClicked = new EventEmitter<User>();

  selectedUser: User | null = null;

  ngOnChanges(): void {
    if (this.selectedUserId) {
      const user = this.users.find(u => u.id === this.selectedUserId);
      if (user && user.id !== this.selectedUser?.id) {
        this.selectedUser = user;
      }
    }
  }

  onSelectUser(user: User) {
    this.selectedUser = user;
    this.userClicked.emit(user);
  }

  closeShowMembers() {
    this.close.emit();
  }

  transferAddMember() {
    this.closeShowMembers();
    this.openAddMembers.emit(this.position);
  }
}