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

  ngOnInit(): void {
    if (this.user?.name) {
      this.updateName.patchValue({ name: this.user.name });
    }
  }

  onSubmit() {
    this.newName = this.updateName.value.name ?? '';
    this.sharedUser.updateName(this.newName);
    this.sharedHeader.editName = !this.sharedHeader.editName;
  }

  get isOwnProfile(): boolean {
    return !!this.user && this.user.id === this.actualUserId;
  }

  onClose() {
    this.close.emit();
  }
}
