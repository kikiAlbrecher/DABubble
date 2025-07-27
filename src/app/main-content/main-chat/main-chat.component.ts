import {
  Component, EventEmitter, inject, Input, OnChanges, OnDestroy, OnInit, Output,
  SimpleChanges, ViewChild
} from '@angular/core';
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
import { SearchService } from '../../header/searchbar/search.service';
import { DevspaceComponent } from '../devspace/devspace.component';

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
    UserProfileComponent,
    DevspaceComponent
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
  searchResults: any[] = [];

  @Input() sideNavOpen: boolean = true;
  @Input() selectedChannel: Channel | null = null;
  @Input() selectedUser: User | null = null;
  @Input() showAddMemberDialog = false;
  @Input() isShowMembersOverlayVisible: boolean = false;
  @Input() isMobile: boolean = false;
  @Input() devspace: boolean = false;
  @Output() showUserProfile = new EventEmitter<void>();
  @Output() editChannel = new EventEmitter<{ position: { top: number; left: number }; isMobileEdit: boolean; }>();
  @Output() showMembers = new EventEmitter<void>();
  @Output() members = new EventEmitter<{ users: User[]; position: { top: number; left: number } }>();
  @Output() addMember = new EventEmitter<{ top: number, left: number }>();
  @Output() selectedUserChange = new EventEmitter<User | null>();
  @Output() userLeftChannel = new EventEmitter<void>();
  @Output() userClicked = new EventEmitter<User>();
  @Output() channelClicked = new EventEmitter<Channel>();
  @Output() searchMail = new EventEmitter<{ success: boolean; message: string }>();
  @ViewChild(WriteMessageComponent) writeMessageComponent!: WriteMessageComponent;

  private channelUsersService = inject(ChannelUsersService);
  public sharedUser = inject(UserSharedService);
  private messagesSubscription?: Subscription;
  public sharedHeader = inject(HeaderSharedService);
  private userSub?: Subscription;
  private messageService = inject(MessageSharedService);
  public searchService = inject(SearchService);

  /**
   * Angular lifecycle hook called on component initialization.
   * Subscribes to user data and channel member changes to update component state.
   */
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

  /**
   * Angular lifecycle hook called when the component is destroyed.
   * Unsubscribes from all active subscriptions to prevent memory leaks.
   */
  ngOnDestroy() {
    this.membershipSubscription?.unsubscribe();
    this.messagesSubscription?.unsubscribe();
    this.userSub?.unsubscribe();
  }

  /**
   * Sets focus on the message input field after a short delay.
   */
  focusWriteMessageInput() {
    setTimeout(() => {
      this.writeMessageComponent?.focusInput();
    }, 30);
  }

  /**
   * Opens the dialog for editing a channel.
   * Positions the dialog relative to the event target element and depending on isMobile or not.
   * 
   * @param event - The mouse event triggering the dialog.
   */
  openDialogEditChannel(event: MouseEvent): void {
    const trigger = event.currentTarget as HTMLElement;
    const rect = trigger.getBoundingClientRect();

    this.editChannel.emit({
      position: this.isMobile ? { top: 0, left: 0 } : { top: rect.bottom + window.scrollY + 8, left: rect.left + window.scrollX },
      isMobileEdit: this.isMobile
    });
  }

  /**
   * Opens the overlay showing channel members.
   * Emits the position and users to be displayed.
   * 
   * @param event - The mouse event triggering the overlay.
   */
  openShowMembers(event: MouseEvent): void {
    this.openMembersOverlay = true;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    let dialogWidth = 415;
    if (this.isMobile) dialogWidth = 300;

    this.members.emit({
      users: this.channelMembers,
      position: {
        top: rect.bottom + window.scrollY + 8,
        left: rect.right + window.scrollX - dialogWidth
      }
    });

    this.selectedUserChange.emit(this.selectedUser);
  }

  /**
   * Opens the dialog to add a new member to the channel.
   * Positions the dialog relative to the event target element.
   * 
   * @param event - The mouse event triggering the dialog.
   */
  openDialogAddMember(event: MouseEvent): void {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const dialogWidth = this.isMobile ? 300 : 514;

    const position = {
      top: rect.bottom + window.scrollY + 8,
      left: rect.right + window.scrollX - dialogWidth
    };

    if (this.isMobile) {
      this.members.emit({ users: this.channelMembers, position });
    } else this.addMember.emit(position);
  }

  /**
   * Toggles the visibility of the main chat panel.
   */
  toggleMainChat() {
    this.mainChatOpen = !this.mainChatOpen;
  }

  /**
   * Emits an event to open the user profile view.
   */
  openProfile() {
    this.showUserProfile.emit();
  }

  /**
   * Angular lifecycle hook called when input properties change.
   * Updates the selected channel and user, and fetches channel members as needed.
   * 
   * @param changes - Object containing changes to input properties.
   */
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

  /**
   * Handles selection of a user.
   * Updates selectedUser and clears selectedChannel.
   * Notifies message service about the selected user.
   * Emits the signal to the mother main-content, that the user has changed, 
   * so that she can inform her children, especially the sidebar.
   * 
   * @param user - The user selected.
   */
  onSelectUser(user: User) {
    this.selectedUser = user;
    this.selectedChannel = null;
    this.messageService.setSelectedUser(user);
    this.messageService.setSelectedChannel(null);
    this.userClicked.emit(user);
  }

  /**
   * Handles selection of a channel.
   * Updates selectedChannel and clears selectedUser.
   * Notifies message service about the selected channel.
   * Emits the signal to the main-content that selected channel has changed.
   * 
   * @param channel - The channel selected.
   */
  onSelectChannel(channel: Channel) {
    this.selectedChannel = channel;
    this.selectedUser = null;
    this.messageService.setSelectedChannel(channel);
    this.messageService.setSelectedUser(null);
    this.channelClicked.emit(channel);
  }

  /**
   * Handles the result of a search operation by assigning the results to a local variable.
   * 
   * @param results - An array of search result items.
   */
  handleSearchResults(results: any[]) {
    this.searchResults = results;
  }

  /**
   * Emits a search event result (e.g., for email search) with success status and message.
   * 
   * @param event - The search result event containing:
   *   - `success`: Whether the search was successful.
   *   - `message`: A descriptive message about the search result.
   */
  onSearchMail(event: { success: boolean; message: string }) {
    this.searchMail.emit(event);
  }
}