import { Component, OnInit } from '@angular/core';
import { UserSharedService } from '../../userManagement/userManagement-service';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { MessageSharedService } from '../../main-content/message-service';

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
    public sharedMessages: MessageSharedService

  ) {}
}
