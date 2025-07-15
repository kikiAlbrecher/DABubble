import { Component, ElementRef, EventEmitter, Input, Output, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { User } from '../../userManagement/user.interface';
import { UsersComponent } from '../../style-components/users/users.component';
import { UserImageStatusComponent } from '../../style-components/user-image-status/user-image-status.component';
import { UserSharedService } from '../../userManagement/userManagement-service';

@Component({
  selector: 'app-search-for-user',
  standalone: true,
  imports: [CommonModule, FormsModule, UsersComponent, UserImageStatusComponent],
  templateUrl: './search-for-user.component.html',
  styleUrl: './search-for-user.component.scss'
})
export class SearchForUserComponent {
  @Input() validUsers: User[] = [];
  @Input() selectedUsers: User[] = [];
  @Output() selectedUsersChange = new EventEmitter<User[]>();
  @ViewChild('userInput') userInputRef!: ElementRef<HTMLInputElement>;

  userSearchTerm = '';
  suggestedUsers: User[] = [];

  userManagement = inject(UserSharedService);

  onUserSearch(term: string) {
    if (term.length < 1) return;

    const lowerTerm = term.toLowerCase();

    this.suggestedUsers = this.validUsers
      .filter(user =>
        user.displayName?.toLowerCase().startsWith(lowerTerm) ||
        user.name?.toLowerCase().startsWith(lowerTerm)
      )
      .filter(u => !this.selectedUsers.find(su => su.id === u.id));
  }

  addUser(user: User) {
    if (!this.selectedUsers.find(u => u.id === user.id)) {
      this.selectedUsers.push(user);
      this.selectedUsersChange.emit(this.selectedUsers);
    }
    this.userSearchTerm = '';
    this.suggestedUsers = [];
    this.focusInput();
  }

  removeUser(user: User) {
    this.selectedUsers = this.selectedUsers.filter(u => u.id !== user.id);
    this.selectedUsersChange.emit(this.selectedUsers);
    this.focusInput();
  }

  focusInput() {
    setTimeout(() => this.userInputRef?.nativeElement.focus(), 0);
  }
}