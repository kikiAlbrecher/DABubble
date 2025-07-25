import { Component, EventEmitter, Output, inject, OnDestroy, OnInit, Input } from '@angular/core';
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

@Component({
  selector: 'app-side-nav',
  standalone: true,
  imports: [CommonModule, UserImageStatusComponent, ChannelsComponent, UsersComponent, SearchbarComponent],
  templateUrl: './side-nav.component.html',
  styleUrl: './side-nav.component.scss'
})
export class SideNavComponent implements OnInit, OnDestroy {
  @Input() showAddChannelDialog = false;
  @Input() isMobile: boolean = false;
  @Input() userHasMadeSelection: boolean = false;
  @Output() addChannel = new EventEmitter<void>();
  @Output() selectChannel = new EventEmitter<Channel>();
  @Output() selectUser = new EventEmitter<User>();
  @Output() toggleDevspace = new EventEmitter<void>();
  @Output() toggleDevspaceM = new EventEmitter<void>();

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
  private userSub?: Subscription;
  private channelsSub?: Subscription;
  private loadUserSub?: Subscription;
  private lastAddedSub?: Subscription;
  private selectedUserSub?: Subscription;
  private selectedChannelSub?: Subscription;

  ngOnInit() {
    this.loadValidUsers();
    this.refreshChannelList();
    this.refreshChannelListAfterAddingChannel();
    this.refreshUsersForMessage();
    this.refreshChannelsForMessage();
  }

  loadValidUsers() {
    this.loadUserSub = this.userService.actualUser$.subscribe(userId => {
      if (userId) {
        this.subscribeToValidChannels();
        this.subscribeToValidUsers();
      }
    });
  }

  refreshChannelList() {
    this.userService.channelListRefresh$.subscribe(() => {
      this.subscribeToValidChannels();
    });
  }

  refreshChannelListAfterAddingChannel() {
    this.lastAddedSub = this.userService.lastAddedChannel$.subscribe(channel => {
      if (channel) {
        setTimeout(() => {
          this.selectedChannelId = channel.channelId;
          this.selectChannel.emit(channel);
        });
      }
    });
  }

  refreshUsersForMessage() {
    this.selectedUserSub = this.messageSharedService.selectedUser$.subscribe(user => {
      if (user) {
        this.selectedUserId = user.id ?? null;
        this.selectedChannelId = null;
      }
    });
  }

  refreshChannelsForMessage() {
    this.selectedChannelSub = this.messageSharedService.selectedChannel$.subscribe(channel => {
      if (channel) {
        this.selectedChannelId = channel.channelId;
        this.selectedUserId = null;
      }
    });
  }

  subscribeToValidChannels() {
    if (!this.channelsSub) {
      this.channelService.subscribeValidChannels();

      this.channelsSub = this.channelService.allValidChannels$.subscribe(channels => {
        this.channels = channels;

        if (channels.length > 0 && !this.selectedChannelId && !this.selectedUserId) {
          if (!this.userHasMadeSelection) {
            if (this.isMobile) {
              this.clearSelection();
            } else {
              this.defaultChannel();
            }
          }
        }
      });
    }
  }

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

  ngOnDestroy(): void {
    this.channelService.unsubscribeChannels();
    this.userSub?.unsubscribe();
    this.channelsSub?.unsubscribe();
    this.loadUserSub?.unsubscribe();
    this.lastAddedSub?.unsubscribe();
    this.selectedUserSub?.unsubscribe();
    this.selectedChannelSub?.unsubscribe();
  }

  defaultChannel() {
    const defaultChannel = this.channels.find(c => c.channelId === 'ClExENSKqKRsmjb17kGy') || this.channels[0];

    if (defaultChannel) {
      this.selectedChannelId = defaultChannel.channelId;
      this.selectChannel.emit(defaultChannel);
    }
  }

  public clearSelection() {
    this.selectedChannelId = null;
    this.selectedUserId = null;
  }

  private markUserName(data: User, id: string, currentUserId: string): User {
    const displayName = id === currentUserId ? `${data.name} (Du)` : data.name;
    return { ...data, id, displayName };
  }

  private sortUsers(users: User[], currentUserId: string): User[] {
    return users.sort((a, b) => {
      if (a.id === currentUserId) return -1;
      if (b.id === currentUserId) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  openDialogAddChannel() {
    this.addChannel.emit();
  }

  toggleWorkspace() {
    this.userService.toggleWorkspace();
  }


  toggleDropDownChannels() {
    this.showChannels = !this.showChannels;
  }

  toggleDropDownUsers() {
    this.showUsers = !this.showUsers;
  }

  toggleDevspaceClicked() {
    this.toggleDevspace.emit();
  }

  toggleDevspaceMobile() {
    this.toggleDevspaceM.emit();
  }

  onSelectUser(user: User) {
    if (this.selectedUserId !== user.id) {
      this.selectedUserId = user.id ?? null;
      this.selectedChannelId = null;
      this.selectUser.emit(user);
      this.userService.threadsVisible$.next(false);
    }
  }

  onSelectChannel(channel: Channel) {
    if (this.selectedChannelId !== channel.channelId) {
      this.selectedChannelId = channel.channelId;
      this.selectedUserId = null;
      this.selectChannel.emit(channel);
      this.userService.threadsVisible$.next(false);
    }
  }
}