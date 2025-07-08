import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { CloseButtonComponent } from '../../style-components/close-button/close-button.component';
import { UsersComponent } from '../../style-components/users/users.component';
import { User } from '../../userManagement/user.interface';
import { Firestore } from 'firebase/firestore';
import { ChannelUsersService } from '../../userManagement/channel-users.service';

@Component({
  selector: 'app-dialog-show-channel-members',
  standalone: true,
  imports: [CommonModule, CloseButtonComponent, UsersComponent],
  templateUrl: './dialog-show-channel-members.component.html',
  styleUrls: ['./../dialog-add-channel/dialog-add-channel.component.scss', './dialog-show-channel-members.component.scss']
})
export class DialogShowChannelMembersComponent {
  @Input() users: User[] = [];
  @Input() selectedUserId: string | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() openAddMembers = new EventEmitter<void>();

  selectedUser: User | null = null;

  onSelectUser(user: User) {
    this.selectedUser = user;
  }

  closeShowMembers() {
    this.close.emit();
  }

  transferAddMember() {
    this.closeShowMembers();
    this.openAddMembers.emit();
  }
}