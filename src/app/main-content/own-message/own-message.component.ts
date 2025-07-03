import { Component, Input } from '@angular/core';
import { UserSharedService } from '../../userManagement/userManagement-service';
import { MessageSharedService } from '../message-service';

@Component({
  selector: 'app-own-message',
  standalone: true,
  imports: [],
  templateUrl: './own-message.component.html',
  styleUrl: './own-message.component.scss'
})
export class OwnMessageComponent {
  @Input() message: any;
  
  constructor(
      public sharedUser: UserSharedService,
      public sharedMessages: MessageSharedService
    ) {}
}
