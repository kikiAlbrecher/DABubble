import { Component, OnInit } from '@angular/core';
import { UserSharedService } from '../../userManagement/userManagement-service';
import { HeaderSharedService } from '../user-header/header-service';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';;

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule
  ],
  templateUrl: './user-profile.component.html',
  styleUrl: './user-profile.component.scss',
})
export class UserProfileComponent implements OnInit {
  constructor(
    public sharedUser: UserSharedService,  
    public sharedHeader: HeaderSharedService,
  ) {}
  
  newName:string = "";

  updateName = new FormGroup<{ name: FormControl<string> }>({
    name: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
  });

  ngOnInit(): void {
    const interval = setInterval(() => {
      if (this.sharedUser.actualUser?.name) {
        this.updateName.patchValue({ name: this.sharedUser.actualUser.name });
        clearInterval(interval);
      }
    }, 100);
  }

  onSubmit() {
    this.newName = this.updateName.value.name ?? '';
    this.sharedUser.updateName(this.newName);
    this.sharedHeader.editName = !this.sharedHeader.editName;
  }
}
