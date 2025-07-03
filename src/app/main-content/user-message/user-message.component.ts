import { Component, Input } from '@angular/core';
import { UserSharedService } from '../../userManagement/userManagement-service';
import { MessageSharedService } from '../message-service';
import { ChatMessage } from '../message.model';

@Component({
  selector: 'app-user-message',
  standalone: true,
  imports: [],
  templateUrl: './user-message.component.html',
  styleUrl: './user-message.component.scss'
})
export class UserMessageComponent {
  @Input() message!: ChatMessage;
  
  constructor(
    public sharedUser: UserSharedService,
    public sharedMessages: MessageSharedService
  ) {}
    


}
