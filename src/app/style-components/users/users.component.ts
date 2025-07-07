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
  @Output() userSelected = new EventEmitter<User>;

  onSelectUser(user: User) {
    this.userSelected.emit(user);
  }
}