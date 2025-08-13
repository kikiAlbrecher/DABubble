import { Component } from '@angular/core';
import { OwnMessageComponent } from "../../main-content/own-message/own-message.component";
import { UserMessageComponent } from "../../main-content/user-message/user-message.component";
import { UserSharedService } from '../../userManagement/userManagement-service';
import { MessageSharedService } from '../../main-content/message-service';
import { ChatMessage } from '../../main-content/message.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-threads-main-chat',
  standalone: true,
  imports: [
    CommonModule,
    OwnMessageComponent,
    UserMessageComponent],
  templateUrl: './threads-main-chat.component.html',
  styleUrl: './threads-main-chat.component.scss'
})
export class ThreadsMainChatComponent {
  constructor(
    public sharedUser: UserSharedService,
    public sharedMessages: MessageSharedService
  ) { }

  get selectedMessage(): ChatMessage | undefined {
    return this.sharedMessages.selectedMessage;
  }
}