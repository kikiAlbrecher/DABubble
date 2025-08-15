import {
  ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, OnChanges, OnInit, Output,
  SimpleChanges, ViewChild, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { User } from '../../userManagement/user.interface';
import { UsersComponent } from '../../style-components/users/users.component';
import { UserImageStatusComponent } from '../../style-components/user-image-status/user-image-status.component';
import { UserSharedService } from '../../userManagement/userManagement-service';

/**
 * Component for searching and selecting users from a list of valid users.
 * Provides suggestions based on input and emits changes to selected users.
 */
@Component({
  selector: 'app-search-for-user',
  standalone: true,
  imports: [CommonModule, FormsModule, UsersComponent, UserImageStatusComponent],
  templateUrl: './search-for-user.component.html',
  styleUrl: './search-for-user.component.scss'
})
export class SearchForUserComponent implements OnInit, OnChanges {
  @Input() validUsers: User[] = [];
  @Input() selectedUsers: User[] = [];
  @Output() selectedUsersChange = new EventEmitter<User[]>();
  @ViewChild('userInput') userInputRef!: ElementRef<HTMLInputElement>;

  userSearchTerm = '';
  suggestedUsers: User[] = [];

  public userManagement = inject(UserSharedService);
  private cdr = inject(ChangeDetectorRef);

  /**
   * Lifecycle hook: initializes the component state.
   */
  ngOnInit() {
    this.userSearchTerm = '';
    this.suggestedUsers = [];
  }

  /**
   * Lifecycle hook: reacts to changes in input properties.
   * @param changes - Object containing the changed input properties.
   */
  ngOnChanges(changes: SimpleChanges) {
    if (changes['validUsers']) {
      setTimeout(() => this.onUserSearch(this.userSearchTerm), 20);
    }
  }

  /**
   * Filters valid users based on the given search term.
   * Excludes already selected users from the suggestions.
   * @param term - The input search string.
   */
  onUserSearch(term: string) {
    this.userSearchTerm = term.trim();

    if (this.userSearchTerm.length < 1) {
      this.suggestedUsers = [];
      return;
    }

    const lowerTerm = this.userSearchTerm.toLowerCase();

    this.suggestedUsers = this.validUsers
      .filter(user =>
        (user.displayName?.toLowerCase().startsWith(lowerTerm) || user.name?.toLowerCase().startsWith(lowerTerm)))
      .filter(u => !this.selectedUsers.find(su => su.id === u.id));
  }

  /**
   * Adds a user to the selected list if not already present.
   * Clears suggestions and search input, then emits the updated selection.
   * @param user - The user to add.
   */
  addUser(user: User) {
    if (!this.selectedUsers.find(u => u.id === user.id)) {
      this.selectedUsers.push(user);
      this.selectedUsersChange.emit(this.selectedUsers);
    }
    this.userSearchTerm = '';
    this.suggestedUsers = [];
    this.cdr.detectChanges();
    this.focusInput();
  }

  /**
   * Removes a user from the selected list and emits the updated selection.
   * @param user - The user to remove.
   */
  removeUser(user: User) {
    this.selectedUsers = this.selectedUsers.filter(u => u.id !== user.id);
    this.selectedUsersChange.emit(this.selectedUsers);
    this.focusInput();
  }

  /**
   * Focuses the input field for continued searching.
   * Delayed slightly to ensure DOM availability.
   */
  focusInput() {
    setTimeout(() => {
      if (this.userInputRef?.nativeElement) {
        this.userInputRef.nativeElement.focus();
      }
    }, 50);
  }
}