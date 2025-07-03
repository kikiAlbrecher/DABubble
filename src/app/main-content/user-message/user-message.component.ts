import { Component } from '@angular/core';
import { UserSharedService } from '../../userManagement/userManagement-service';
import { MessageSharedService } from '../message-service';

@Component({
  selector: 'app-user-message',
  standalone: true,
  imports: [],
  templateUrl: './user-message.component.html',
  styleUrl: './user-message.component.scss'
})
export class UserMessageComponent {
  constructor(
    public sharedUser: UserSharedService,
    public sharedMessages: MessageSharedService
  ) {}
    


}
