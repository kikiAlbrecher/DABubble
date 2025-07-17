import { Component, inject, AfterViewChecked, ElementRef, ViewChild, Input  } from '@angular/core';
import { OwnMessageComponent } from "../own-message/own-message.component";
import { UserMessageComponent } from "../user-message/user-message.component";
import { UserSharedService } from '../../userManagement/userManagement-service';
import { MessageSharedService } from '../message-service';
import { combineLatest } from 'rxjs';
import { ChatMessage } from '../message.model';
import { CommonModule } from '@angular/common';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';

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
  private firestore = inject(Firestore);
  messagesLength = 0;
  creatorName:[] = [];
  creatorId: string = ""

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
      this.getChannelCreator();
    } else {
      this.sharedMessages.selectedUser = null;
      this.sharedMessages.selectedChannel = null;
    }
  });    
}

openUserDetail() {
  this.sharedUser.detailOverlay = !this.sharedUser.detailOverlay
}

async getChannelCreator() {
  const creatorId = this.sharedMessages.selectedChannel?.channelCreatorId ?? '';
  this.creatorId = creatorId;
  const channelRef = doc(this.firestore, 'users', creatorId);
  const docSnap = await getDoc(channelRef);
    if (docSnap.exists()) {
    const user = docSnap.data();
    this.creatorName = user['displayName'];     
    console.log(this.sharedUser.actualUserID);
    
  } 
}

}



