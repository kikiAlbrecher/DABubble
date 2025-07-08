import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Firestore, collection, query, where, getDocs } from '@angular/fire/firestore';
import { User } from '../../userManagement/user.interface';
import { UsersComponent } from '../../style-components/users/users.component';
import { UserImageStatusComponent } from '../../style-components/user-image-status/user-image-status.component';

@Component({
  selector: 'app-search-for-user',
  standalone: true,
  imports: [CommonModule, FormsModule, UsersComponent, UserImageStatusComponent],
  templateUrl: './search-for-user.component.html',
  styleUrl: './search-for-user.component.scss'
})
export class SearchForUserComponent {
  @Input() selectedUsers: User[] = [];
  @Output() selectedUsersChange = new EventEmitter<User[]>();

  userSearchTerm = '';
  suggestedUsers: User[] = [];

  private firestore = inject(Firestore);

  async onUserSearch(term: string) {
    if (term.length < 1) return;

    const usersRef = collection(this.firestore, 'users');
    const q = query(usersRef,
      where('displayNameLowercase', '>=', term.toLowerCase()),
      where('displayNameLowercase', '<=', term.toLowerCase() + '\uf8ff')
    );
    const snap = await getDocs(q);
    this.suggestedUsers = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))
      .filter(u => !this.selectedUsers.find(su => su.id === u.id));
  }

  addUser(user: User) {
    if (!this.selectedUsers.find(u => u.id === user.id)) {
      this.selectedUsers.push(user);
      this.selectedUsersChange.emit(this.selectedUsers);
    }
    this.userSearchTerm = '';
    this.suggestedUsers = [];
  }

  removeUser(user: User) {
    this.selectedUsers = this.selectedUsers.filter(u => u.id !== user.id);
    this.selectedUsersChange.emit(this.selectedUsers);
  }
}