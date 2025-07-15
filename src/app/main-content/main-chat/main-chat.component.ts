import { Component, EventEmitter, inject, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserSharedService } from '../../userManagement/userManagement-service';
import { Subscription } from 'rxjs';
import { User } from '../../userManagement/user.interface';
import { Channel } from '../../../models/channel.class';
import { ChannelUsersService } from '../../userManagement/channel-users.service';
import { DialogAddMemberComponent } from '../dialog-add-member/dialog-add-member.component';
import { DialogEditChannelComponent } from '../dialog-edit-channel/dialog-edit-channel.component';
import { UserImageStatusComponent } from '../../style-components/user-image-status/user-image-status.component';
import { WriteMessageComponent } from '../write-message/write-message.component';
import { MessageBoardComponent } from "../message-board/message-board.component";
import { HeaderSharedService } from '../../header/user-header/header-service';
import { UserProfileComponent } from '../../header/user-profile/user-profile.component';

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
  @Output() showUserProfile = new EventEmitter<void>();
  @Output() editChannel = new EventEmitter<{ top: number, left: number }>();
  @Output() showMembers = new EventEmitter<void>();
  @Output() members = new EventEmitter<{ users: User[]; position: { top: number; left: number } }>();
  @Output() addMember = new EventEmitter<{ top: number, left: number }>();
  @Output() selectedUserChange = new EventEmitter<User | null>();
  @Output() userLeftChannel = new EventEmitter<void>();

  private channelUsersService = inject(ChannelUsersService);
  public sharedUser = inject(UserSharedService);
  private messagesSubscription?: Subscription;
  public sharedHeader = inject(HeaderSharedService);
  private userSub?: Subscription;

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

  openDialogEditChannel(event: MouseEvent): void {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const windowWidth = window.innerWidth;

    if (windowWidth >= 1000) {
      let left = rect.left;

      this.editChannel.emit({
        top: rect.bottom,
        left: left
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

  async ngOnChanges(changes: SimpleChanges) {
    if (changes['selectedChannel'] && this.selectedChannel) {
      this.channelMembers = await this.channelUsersService.getUsersForChannel(this.selectedChannel.channelId);
    }

    if (changes['isShowMembersOverlayVisible'] && !changes['isShowMembersOverlayVisible'].currentValue) {
      this.openMembersOverlay = false;
    }
  }
}