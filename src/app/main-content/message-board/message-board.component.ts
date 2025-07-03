import { Component, AfterViewChecked, ElementRef, ViewChild  } from '@angular/core';
import { OwnMessageComponent } from "../own-message/own-message.component";
import { UserMessageComponent } from "../user-message/user-message.component";
import { UserSharedService } from '../../userManagement/userManagement-service';
import { MessageSharedService } from '../message-service';
import { combineLatest } from 'rxjs';

@Component({
  selector: 'app-message-board',
  standalone: true,
  imports: [
    OwnMessageComponent, 
    UserMessageComponent
  ],
  templateUrl: './message-board.component.html',
  styleUrl: './message-board.component.scss'
})
export class MessageBoardComponent {
  
  constructor(
      public sharedUser: UserSharedService,
      public sharedMessages: MessageSharedService
    ) {}

  @ViewChild('messageContainer') private messageContainer!: ElementRef;

   private initialScrollDone = false;

  ngAfterViewChecked() {
    if (!this.initialScrollDone) {
      this.scrollToBottom();
      this.initialScrollDone = true;
    }
  }

  scrollToBottom() {
    setTimeout(() => {
      this.messageContainer.nativeElement.scrollTop = this.messageContainer.nativeElement.scrollHeight;
    }, 0);
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





