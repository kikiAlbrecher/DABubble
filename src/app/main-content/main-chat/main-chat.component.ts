import { Component, EventEmitter, inject, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserSharedService } from '../../userManagement/userManagement-service';
import { Subscription } from 'rxjs';
import { User } from '../../userManagement/user.interface';
import { Channel } from '../../../models/channel.class';
import { ChannelUsersService } from '../../channel-management/channel-users.service';
import { DialogAddMemberComponent } from '../dialog-add-member/dialog-add-member.component';
import { DialogEditChannelComponent } from '../dialog-edit-channel/dialog-edit-channel.component';
import { UserImageStatusComponent } from '../../style-components/user-image-status/user-image-status.component';
import { WriteMessageComponent } from '../write-message/write-message.component';
import { MessageBoardComponent } from "../message-board/message-board.component";
import { HeaderSharedService } from '../../header/user-header/header-service';
import { UserProfileComponent } from '../../header/user-profile/user-profile.component';
import { MessageSharedService } from '../message-service';

@Component({
  selector: 'app-main-chat',
  standalone: true,
  imports: [CommonModule,
    FormsModule,
    DialogAddMemberComponent,
    DialogEditChannelComponent,
    WriteMessageComponent,
    MessageBoardComponent,
    UserImageStatusComponent,
    UserProfileComponent
  ],
  templateUrl: './main-chat.component.html',
  styleUrls: ['./../side-nav/side-nav.component.scss', './main-chat.component.scss']
})
export class MainChatComponent implements OnInit, OnChanges, OnDestroy {
  messages: any[] = [];
  newMessage: string = '';
  mainChatOpen = true;
  channelMembers: User[] = [];
  users: User[] = [];
  membershipSubscription?: Subscription;
  openMembersOverlay: boolean = false;

  @Input() sideNavOpen: boolean = true;
  @Input() selectedChannel: Channel | null = null;
  @Input() selectedUser: User | null = null;
  @Input() showAddMemberDialog = false;
  @Input() isShowMembersOverlayVisible: boolean = false;
  @Input() isMobile: boolean = false;
  @Input() devspace: boolean = false;
  @Output() showUserProfile = new EventEmitter<void>();
  @Output() editChannel = new EventEmitter<{ top: number, left: number }>();
  @Output() showMembers = new EventEmitter<void>();
  @Output() members = new EventEmitter<{ users: User[]; position: { top: number; left: number } }>();
  @Output() addMember = new EventEmitter<{ top: number, left: number }>();
  @Output() selectedUserChange = new EventEmitter<User | null>();
  @Output() userLeftChannel = new EventEmitter<void>();
  @ViewChild(WriteMessageComponent) writeMessageComponent!: WriteMessageComponent;

  private channelUsersService = inject(ChannelUsersService);
  public sharedUser = inject(UserSharedService);
  private messagesSubscription?: Subscription;
  public sharedHeader = inject(HeaderSharedService);
  private userSub?: Subscription;
  private messageService = inject(MessageSharedService);


  ngOnInit() {
    this.sharedUser.subscribeValidUsers();

    this.userSub = this.sharedUser.allValidUsers$.subscribe(users => {
      this.users = users;
    });
    this.membershipSubscription = this.sharedUser.channelMembersChanged$.subscribe(async () => {
      if (this.selectedChannel) {
        this.channelMembers = await this.channelUsersService.getUsersForChannel(this.selectedChannel.channelId);
      }
    });
  }

  ngOnDestroy() {
    this.membershipSubscription?.unsubscribe();
    this.messagesSubscription?.unsubscribe();
    this.userSub?.unsubscribe();
  }

  focusWriteMessageInput() {
    setTimeout(() => {
      this.writeMessageComponent?.focusInput();
    }, 30);
  }

  openDialogEditChannel(event: MouseEvent): void {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();

    if (!this.isMobile) {
      this.editChannel.emit({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX
      });
    } else {
      this.editChannel.emit({ top: 0, left: 0 });
    }
  }

  openShowMembers(event: MouseEvent): void {
    this.openMembersOverlay = true;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    let dialogWidth = 415;

    this.members.emit({
      users: this.channelMembers,
      position: {
        top: rect.bottom + window.scrollY + 8,
        left: rect.right + window.scrollX - dialogWidth
      }
    });

    this.selectedUserChange.emit(this.selectedUser);
  }

  openDialogAddMember(event: MouseEvent): void {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    let dialogWidth = 514;

    this.addMember.emit({
      top: rect.bottom + window.scrollY + 8,
      left: rect.right + window.scrollX - dialogWidth
    });
  }

  toggleMainChat() {
    this.mainChatOpen = !this.mainChatOpen;
  }

  openProfile() {
    this.showUserProfile.emit();
  }

  async ngOnChanges(changes: SimpleChanges) {
    if (changes['selectedChannel'] && this.selectedChannel) {
      this.messageService.setSelectedChannel(this.selectedChannel);
      this.messageService.setSelectedUser(null);
      this.channelMembers = await this.channelUsersService.getUsersForChannel(this.selectedChannel.channelId);
    }

    if (changes['selectedUser'] && this.selectedUser) {
      this.messageService.setSelectedUser(this.selectedUser);
      this.messageService.setSelectedChannel(null);
    }

    if (changes['isShowMembersOverlayVisible'] && !changes['isShowMembersOverlayVisible'].currentValue) {
      this.openMembersOverlay = false;
    }
  }

  onSelectUser(user: User) {
    this.selectedUser = user;
    this.selectedChannel = null;
    this.messageService.setSelectedUser(user);
    this.messageService.setSelectedChannel(null);
  }

  onSelectChannel(channel: Channel) {
    this.selectedChannel = channel;
    this.selectedUser = null;
    this.messageService.setSelectedChannel(channel);
    this.messageService.setSelectedUser(null);
  }
}