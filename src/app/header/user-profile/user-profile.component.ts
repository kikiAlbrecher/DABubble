import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { UserSharedService } from '../../userManagement/userManagement-service';
import { HeaderSharedService } from '../user-header/header-service';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { User } from '../../userManagement/user.interface';
import { CommonModule } from '@angular/common';
import { MessageSharedService } from '../../main-content/message-service';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, CommonModule],
  templateUrl: './user-profile.component.html',
  styleUrl: './user-profile.component.scss',
})
export class UserProfileComponent implements OnInit {
  @Input() user: User | null = null;
  @Input() actualUserId: string = '';
  @Input() allowEdit: boolean = true;
  @Input() showUser: boolean = false;
  @Output() close = new EventEmitter<void>();
  @Output() sendMessage = new EventEmitter<User>();

  constructor(
    public sharedUser: UserSharedService,
    public sharedHeader: HeaderSharedService,
    public sharedMessages: MessageSharedService
  ) { }

  newName: string = '';

  images = [
    'assets/img/avatar1.svg',
    'assets/img/avatar2.svg',
    'assets/img/avatar3.svg',
    'assets/img/avatar4.svg',
    'assets/img/avatar5.svg',
    'assets/img/avatar6.svg',
  ]

  avatarImg: string = 'assets/img/avatar-placeholder.svg';

  updateName = new FormGroup<{ name: FormControl<string> }>({
    name: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.minLength(3), Validators.maxLength(15)] }),
  });
  nameLength: boolean = false;

  /**
   * On component initialization, populate the update form with the user's current name.
   */
  ngOnInit(): void {
    if (this.user?.name) this.updateName.patchValue({ name: this.user.name });

    this.avatarImg = this.user?.picture || 'assets/img/avatar-placeholder.svg';
  }

  /**
   * Handles form submission to update the user's name and avatar.
   * Validates form input, updates local user data and shared services.
   */
  onSubmit() {
    if (this.updateName.invalid) return this.handleInvalidName();

    this.nameLength = false;
    this.newName = this.updateName.value.name ?? '';

    this.sharedUser.updateName(this.newName);

    this.updateLocalUser();
    this.updateAvatarIfNeeded();
    this.updateSelectedUserIfOwnProfile();

    this.sharedHeader.editName = false;
  }

  /**
   * Handles invalid name form input by showing the validation message.
   */
  private handleInvalidName() {
    this.nameLength = true;
  }

  /**
   * Updates the local user object with the new name and avatar.
   */
  private updateLocalUser() {
    if (!this.user) return;

    this.user.name = this.newName;
    this.user.picture = this.avatarImg;
  }

  /**
   * Updates the shared avatar if the user has selected a new one.
   */
  private updateAvatarIfNeeded() {
    const updatedUser: User = {
      ...(this.sharedUser.userDetails as User),
      name: this.newName,
      picture: this.sharedHeader.newPicture ? this.avatarImg
        : this.user?.picture || 'assets/img/avatar-placeholder.svg',
    };

    if (this.sharedHeader.newPicture) this.sharedUser.changeAvatar(updatedUser.picture);

    this.sharedUser.updateUserDetails(updatedUser);
  }

  /**
   * Updates the selected user in message view if it is the current user.
   */
  private updateSelectedUserIfOwnProfile() {
    const selected = this.sharedMessages.selectedUser;

    if (selected?.id !== this.sharedUser.actualUserID) return;

    const updatedUser: User = { ...selected, name: this.newName, displayName: this.newName };

    this.sharedMessages.setSelectedUser(updatedUser);
  }

  /**
   * Returns true if the profile belongs to the logged-in user.
   */
  get isOwnProfile(): boolean {
    return !!this.user && this.user.id === this.actualUserId;
  }

  /**
   * Emits the close event to notify parent components to close this profile view.
   */
  onClose() {
    this.close.emit();
    this.sharedHeader.newPicture = false;
  }

  /**
   * Sets the selected image as the user's avatar.
   * Also toggles the picturePicked flag for UI feedback.
   * 
   * @param item - Path to the selected avatar image
   */
  setImage(item: string) {
    this.avatarImg = item;
    this.sharedHeader.newPicture = true;
  }

  /**
   * TrackBy function to optimize avatar image rendering in ngFor.
   * @param index - Index of the item in the list.
   * @param item - The avatar image path.
   * @returns The index to use for tracking.
   */
  trackByIndex(index: number, item: string): number {
    return index;
  }
}