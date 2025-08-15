import {
  Component, EventEmitter, Output, inject, OnDestroy, OnInit, Input, ChangeDetectorRef, OnChanges,
  SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserSharedService } from '../../userManagement/userManagement-service';
import { Channel } from '../../../models/channel.class';
import { User } from '../../userManagement/user.interface';
import { Subscription } from 'rxjs';
import { UserImageStatusComponent } from '../../style-components/user-image-status/user-image-status.component';
import { MessageSharedService } from '../message-service';
import { ChannelsComponent } from '../../style-components/channels/channels.component';
import { UsersComponent } from '../../style-components/users/users.component';
import { SearchbarComponent } from '../../header/searchbar/searchbar.component';
import { ChannelSharedService } from '../../channel-management/channel-shared.service';

/**
 * Component responsible for rendering the side navigation.
 * Displays available channels and users, and manages selection behavior.
 */
@Component({
  selector: 'app-side-nav',
  standalone: true,
  imports: [CommonModule, UserImageStatusComponent, ChannelsComponent, UsersComponent, SearchbarComponent],
  templateUrl: './side-nav.component.html',
  styleUrl: './side-nav.component.scss'
})
export class SideNavComponent implements OnInit, OnChanges, OnDestroy {
  @Input() showAddChannelDialog = false;
  @Input() isMobile: boolean = false;
  @Input() userHasMadeSelection: boolean = false;
  @Input() selectedChannel: Channel | null = null;
  @Input() selectedUser: User | null = null;
  @Input() devspaceOpen: boolean = false;
  @Input() clearSelectionTrigger: boolean = false;
  @Output() addChannel = new EventEmitter<void>();
  @Output() selectChannel = new EventEmitter<Channel>();
  @Output() selectUser = new EventEmitter<User>();
  @Output() openDevspace = new EventEmitter<void>();
  @Output() closeDevspace = new EventEmitter<void>();
  @Output() toggleDevspaceM = new EventEmitter<void>();
  @Output() searchMobile = new EventEmitter<void>();
  @Output() mainChatOpened = new EventEmitter<void>();

  workspaceOpen: boolean = true;
  showChannels: boolean = true;
  showUsers: boolean = true;
  channels: Channel[] = [];
  users: User[] = [];
  selectedChannelId: string | null = null;
  selectedUserId: string | null = null;

  public userService = inject(UserSharedService);
  public channelService = inject(ChannelSharedService);
  private messageSharedService = inject(MessageSharedService);
  private cdr = inject(ChangeDetectorRef);
  private userSub?: Subscription;
  private channelsSub?: Subscription;
  private loadUserSub?: Subscription;
  private lastAddedSub?: Subscription;
  private selectedUserSub?: Subscription;
  private selectedChannelSub?: Subscription;

  /**
   * Lifecycle hook: Initializes subscriptions and loads data.
   */
  ngOnInit() {
    this.loadValidUsers();
    this.refreshChannelList();
    this.refreshChannelListAfterAddingChannel();
    this.refreshUsersForMessage();
    this.refreshChannelsForMessage();
  }

  /**
   * Subscribes to the currently logged-in user and loads channels and users.
   */
  loadValidUsers() {
    this.loadUserSub = this.userService.actualUser$.subscribe(userId => {
      if (userId) {
        this.subscribeToValidChannels();
        this.subscribeToValidUsers();
      }
    });
  }

  /**
   * Subscribes to channel refresh events to reload valid channels.
   */
  refreshChannelList() {
    this.userService.channelListRefresh$.subscribe(() => {
      this.subscribeToValidChannels();
    });
  }

  /**
   * Subscribes to the last added channel and selects it automatically.
   */
  refreshChannelListAfterAddingChannel() {
    this.lastAddedSub = this.userService.lastAddedChannel$.subscribe(channel => {
      if (channel) {
        Promise.resolve().then(() => {
          this.selectedChannelId = channel.channelId;
          this.selectChannel.emit(channel);
          this.cdr.detectChanges();
        });
      }
    });
  }

  /**
   * Subscribes to selected user updates from message service.
   */
  refreshUsersForMessage() {
    this.selectedUserSub = this.messageSharedService.selectedUser$.subscribe(user => {
      if (user) {
        this.selectedUserId = user.id ?? null;
        this.selectedChannelId = null;
      }
    });
  }

  /**
   * Subscribes to selected channel updates from message service.
   */
  refreshChannelsForMessage() {
    this.selectedChannelSub = this.messageSharedService.selectedChannel$.subscribe(channel => {
      if (channel) {
        this.selectedChannelId = channel.channelId;
        this.selectedUserId = null;
      }
    });
  }

  /**
   * Subscribes to valid channels from the channel service.
   */
  subscribeToValidChannels() {
    if (!this.channelsSub) {
      this.channelService.subscribeValidChannels();

      this.channelsSub = this.channelService.allValidChannels$.subscribe(channels => {
        this.channels = channels;

        if (channels.length > 0 && !this.selectedChannelId && !this.selectedUserId) {
          if (!this.userHasMadeSelection) {
            this.isMobile ? this.clearSelection() : this.defaultChannel();
          }
        }
      });
    }
  }

  /**
   * Subscribes to valid users from the user service.
   */
  subscribeToValidUsers() {
    if (!this.userSub) {
      this.userService.subscribeValidUsers();

      this.userSub = this.userService.allValidUsers$.subscribe(users => {
        const currentUserId = this.userService.actualUserID;
        const usersWithMarkedNames = users.map(user => this.markUserName(user, user.id!, currentUserId));
        const sortedUsers = this.sortUsers(usersWithMarkedNames, currentUserId);
        this.users = sortedUsers;
      });
    }
  }

  /**
   * Lifecycle hook that is called when any data-bound property of a directive changes.
   * 
   * This implementation checks if the `clearSelectionTrigger` input has changed.
   * If its previous value was falsy and its current value is truthy, the `clearSelection()` method is called.
   * 
   * @param {SimpleChanges} changes - An object of changed properties.
   */
  ngOnChanges(changes: SimpleChanges) {
    if (changes['clearSelectionTrigger']) {
      const prev = changes['clearSelectionTrigger'].previousValue;
      const curr = changes['clearSelectionTrigger'].currentValue;

      if (!prev && curr) this.clearSelection();
    }
  }

  /**
   * Lifecycle hook: Cleans up subscriptions.
   */
  ngOnDestroy(): void {
    this.channelService.unsubscribeChannels();
    this.userSub?.unsubscribe();
    this.channelsSub?.unsubscribe();
    this.loadUserSub?.unsubscribe();
    this.lastAddedSub?.unsubscribe();
    this.selectedUserSub?.unsubscribe();
    this.selectedChannelSub?.unsubscribe();
  }

  /**
   * Selects and emits the default channel.
   */
  defaultChannel() {
    const defaultChannel = this.channels.find(c => c.channelId === 'ClExENSKqKRsmjb17kGy') || this.channels[0];

    if (defaultChannel) {
      this.selectedChannelId = defaultChannel.channelId;
      this.selectChannel.emit(defaultChannel);
    }
  }

  /**
   * Clears the current channel and user selection.
   */
  public clearSelection() {
    this.selectedChannelId = null;
    this.selectedUserId = null;
  }

  /**
   * Appends display name modifications to the user (e.g., marks "(You)").
   * @param data - The user object.
   * @param id - The user ID.
   * @param currentUserId - The current logged-in user ID.
   * @returns Modified user with displayName.
   */
  private markUserName(data: User, id: string, currentUserId: string): User {
    const displayName = id === currentUserId ? `${data.name} (Du)` : data.name;
    return { ...data, id, displayName };
  }

  /**
   * Sorts users so the current user appears first, followed by others alphabetically.
   * @param users - Array of users.
   * @param currentUserId - Current user's ID.
   * @returns Sorted array of users.
   */
  private sortUsers(users: User[], currentUserId: string): User[] {
    return users.sort((a, b) => {
      if (a.id === currentUserId) return -1;
      if (b.id === currentUserId) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Emits event to open the Add Channel dialog.
   */
  openDialogAddChannel() {
    this.addChannel.emit();
  }

  /**
   * Toggles the workspace open/closed.
   */
  toggleWorkspace() {
    this.userService.toggleWorkspace();
  }

  /**
   * Toggles visibility of the channels dropdown.
   */
  toggleDropDownChannels() {
    this.showChannels = !this.showChannels;
  }

  /**
   * Toggles visibility of the users dropdown.
   */
  toggleDropDownUsers() {
    this.showUsers = !this.showUsers;
  }

  /**
   * Emits event to toggle devspace (desktop).
   */
  toggleDevspaceClicked() {
    this.devspaceOpen ? this.closeDevspace.emit() : this.openDevspace.emit();
  }

  /**
   * Emits event to toggle devspace (mobile).
   */
  toggleDevspaceMobile() {
    this.toggleDevspaceM.emit();
  }

  /**
   * Handles user selection.
   * @param user - The selected user.
   */
  onSelectUser(user: User) {
    if (this.selectedUserId !== user.id) {
      this.selectedUserId = user.id ?? null;
      this.selectedChannelId = null;
      this.selectUser.emit(user);
      this.userService.threadsVisible$.next(false);

      if (this.devspaceOpen) this.closeDevspace.emit();
    }
  }

  /**
   * Handles channel selection.
   * @param channel - The selected channel.
   */
  onSelectChannel(channel: Channel) {
    if (this.selectedChannelId !== channel.channelId) {
      this.selectedChannelId = channel.channelId;
      this.selectedUserId = null;
      this.selectChannel.emit(channel);
      this.userService.threadsVisible$.next(false);

      if (this.devspaceOpen) this.closeDevspace.emit();
    }
  }

  /**
   * Emits event to notify mobile search has started.
   */
  onSearchStart() {
    this.searchMobile.emit();
  }
}