import { Component, OnInit } from '@angular/core';
import { UserSharedService } from '../../userManagement/userManagement-service';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-user-detail',
  standalone: true,
  imports: [],
  templateUrl: './user-detail.component.html',
  styleUrl: './user-detail.component.scss'
})
export class UserDetailComponent {
constructor(
    public sharedUser: UserSharedService,  

  ) {}
}
