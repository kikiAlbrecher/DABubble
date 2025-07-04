import { Component, EventEmitter, inject, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Firestore } from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { User } from '../../userManagement/user.interface';
import { Channel } from '../../../models/channel.class';
import { UserSharedService } from '../../userManagement/userManagement-service';
import { DialogAddMemberComponent } from '../dialog-add-member/dialog-add-member.component';
import { UserImageStatusComponent } from '../../style-components/user-image-status/user-image-status.component';
import { WriteMessageComponent } from '../write-message/write-message.component';
import { MessageBoardComponent } from "../message-board/message-board.component";
import { ChannelUsersService } from '../../userManagement/channel-users.service';

@Component({
  selector: 'app-main-chat',
  standalone: true,
  imports: [CommonModule,
    FormsModule,
    DialogAddMemberComponent,
    UserImageStatusComponent,
    WriteMessageComponent,
    MessageBoardComponent,
    UserImageStatusComponent],
  templateUrl: './main-chat.component.html',
  styleUrls: ['./../side-nav/side-nav.component.scss', './main-chat.component.scss']
})
export class MainChatComponent implements OnInit, OnChanges, OnDestroy {
  messages: any[] = [];
  newMessage: string = '';
  mainChatOpen = true;
  channelMembers: User[] = [];

  @Output() addMember = new EventEmitter<void>();
  @Input() sideNavOpen: boolean = true;
  @Input() selectedChannel: Channel | null = null;
  @Input() selectedUser: User | null = null;

  private firestore = inject(Firestore);
  private channelUsersService = inject(ChannelUsersService);
  private sharedUser = inject(UserSharedService);
  private messagesSubscription?: Subscription;

  ngOnInit() {
    if (this.selectedChannel) {
      // this.loadMessages(this.selectedChannel.channelId);
    }
  }

  ngOnDestroy() {
    this.messagesSubscription?.unsubscribe();
  }

  openDialogAddMember() {
    this.addMember.emit();
  }

  // loadMessages(channelId: string) {
  //   const messagesCollection = collection(this.firestore, channels / ${ channelId } / messages);
  //   this.messagesSubscription = collectionData(messagesCollection, { idField: 'id' }).subscribe((msgs) => {
  //     this.messages = msgs;
  //   });
  // }

  // async sendMessage() {
  //   if (!this.newMessage.trim() || !this.selectedChannel) return;

  //   const messagesCollection = collection(this.firestore, channels / ${ this.selectedChannel.channelId } / messages);
  //   await addDoc(messagesCollection, {
  //     text: this.newMessage,
  //     timestamp: new Date(),
  //     user: {
  //     }
  //   });

  //   this.newMessage = '';
  // }

  toggleMainChat() {
    this.mainChatOpen = !this.mainChatOpen;
  }

  async ngOnChanges(changes: SimpleChanges) {
    if (changes['selectedChannel'] && this.selectedChannel) {
      this.channelMembers = await this.channelUsersService.getUsersForChannel(this.selectedChannel.channelId);
    }
  }
}