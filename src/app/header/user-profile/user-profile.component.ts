import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { UserSharedService } from '../../userManagement/userManagement-service';
import { HeaderSharedService } from '../user-header/header-service';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { User } from '../../userManagement/user.interface';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    CommonModule
  ],
  templateUrl: './user-profile.component.html',
  styleUrl: './user-profile.component.scss',
})
export class UserProfileComponent implements OnInit {
  @Input() user: User | null = null;
  @Input() actualUserId: string = '';
  @Input() isHeader: boolean = false;
  @Input() showUser: boolean = false;
  @Output() close = new EventEmitter<void>();
  @Output() sendMessage = new EventEmitter<User>();

  constructor(
    public sharedUser: UserSharedService,
    public sharedHeader: HeaderSharedService,
  ) { }

  newName: string = "";

  updateName = new FormGroup<{ name: FormControl<string> }>({
    name: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
  });

  
  /**
   * On component initialization, populate the update form with the user's current name.
   */
  ngOnInit(): void {
    if (this.user?.name) {
      this.updateName.patchValue({ name: this.user.name });
    }
  }

  /**
   * Submit the updated name, triggering the UserSharedService to update the user's name,
   * and toggle the edit state in the HeaderSharedService.
   */
  onSubmit() {
    this.newName = this.updateName.value.name ?? '';
    this.sharedUser.updateName(this.newName);
    this.sharedHeader.editName = !this.sharedHeader.editName;
  }

  /**
   * Returns true if the profile belongs to the logged-in user.
   */
  get isOwnProfile(): boolean {
    return !!this.user && this.user.id === this.actualUserId;
  }

  /**
   * Emit the close event to notify parent components to close this profile view.
   */
  onClose() {
    this.close.emit();
  }
}
