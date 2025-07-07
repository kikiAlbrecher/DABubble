import { Component, AfterViewChecked, ElementRef, ViewChild, Input  } from '@angular/core';
import { OwnMessageComponent } from "../own-message/own-message.component";
import { UserMessageComponent } from "../user-message/user-message.component";
import { UserSharedService } from '../../userManagement/userManagement-service';
import { MessageSharedService } from '../message-service';
import { combineLatest } from 'rxjs';
import { ChatMessage } from '../message.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-message-board',
  standalone: true,
  imports: [
    OwnMessageComponent, 
    UserMessageComponent,
    CommonModule,
  ],
  templateUrl: './message-board.component.html',
  styleUrl: './message-board.component.scss'
})
export class MessageBoardComponent {
  @Input() message!: ChatMessage;
  constructor(
      public sharedUser: UserSharedService,
      public sharedMessages: MessageSharedService
    ) {}

  @ViewChild('messageContainer') private messageContainer!: ElementRef;

messagesLength = 0;

ngAfterViewChecked() {
  if (this.sharedMessages.messages.length !== this.messagesLength) {
    this.messagesLength = this.sharedMessages.messages.length;
    this.scrollToBottom();
  }
}

scrollToBottom() {
  setTimeout(() => {
    this.messageContainer.nativeElement.scrollTop = this.messageContainer.nativeElement.scrollHeight;
  }, 100);
}

ngOnInit() {
  combineLatest([
    this.sharedMessages.selectedUser$,
    this.sharedMessages.selectedChannel$
  ]).subscribe(([user, channel]) => {
    if (user) {
      this.sharedMessages.selectedUser = user;
      this.sharedMessages.selectedChannel = null;
      this.sharedMessages.channelSelected = false;
      this.sharedMessages.userSelected = true;
      this.sharedMessages.getUserMessages();
    } else if (channel) {
      this.sharedMessages.selectedChannel = channel;
      this.sharedMessages.selectedUser = null;
      this.sharedMessages.channelSelected = true;
      this.sharedMessages.userSelected = false;
      this.sharedMessages.getChannelMessages();
    } else {
      this.sharedMessages.selectedUser = null;
      this.sharedMessages.selectedChannel = null;
    }
  });  
}



  
}





