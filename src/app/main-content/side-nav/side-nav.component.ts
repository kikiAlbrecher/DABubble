import { Component, EventEmitter, Output, inject, OnDestroy, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { collection, onSnapshot, Firestore } from '@angular/fire/firestore';
import { UserSharedService } from '../../userManagement/userManagement-service';
import { Channel } from '../../../models/channel.class';
import { User } from '../../userManagement/user.interface';
import { Subscription } from 'rxjs';
import { UserImageStatusComponent } from '../../style-components/user-image-status/user-image-status.component';
import { MessageSharedService } from '../message-service';
import { ChannelsComponent } from '../../style-components/channels/channels.component';
import { UsersComponent } from '../../style-components/users/users.component';

@Component({
  selector: 'app-side-nav',
  standalone: true,
  imports: [CommonModule, UserImageStatusComponent, ChannelsComponent, UsersComponent],
  templateUrl: './side-nav.component.html',
  styleUrl: './side-nav.component.scss'
})
export class SideNavComponent implements OnInit, OnDestroy {
  @Input() showAddChannelDialog = false;
  @Output() addChannel = new EventEmitter<void>();
  @Output() selectChannel = new EventEmitter<Channel>();
  @Output() selectUser = new EventEmitter<User>();

  workspaceOpen = true;
  showChannels = true;
  showUsers = true;
  channels: Channel[] = [];
  users: User[] = [];
  selectedChannelId: string | null = null;
  selectedUserId: string | null = null;

  private firestore = inject(Firestore);
  public userService = inject(UserSharedService);
  private messageSharedService = inject(MessageSharedService);
  private unsubscribeChannels?: () => void;
  private unsubscribeUsers?: () => void;
  private userSub?: Subscription;

  ngOnInit() {
    this.listenToChannels();
    this.userSub = this.userService.actualUser$.subscribe(currentUserId => {
      if (currentUserId) {
        this.listenToUsers(currentUserId);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.unsubscribeChannels) this.unsubscribeChannels();
    if (this.unsubscribeUsers) this.unsubscribeUsers();
    this.userSub?.unsubscribe();
  }

  listenToChannels() {
    const channelsRef = collection(this.firestore, 'channels');

    this.unsubscribeChannels = onSnapshot(channelsRef, snapshot => {
      this.channels = snapshot.docs.map(doc => doc.data() as Channel);
      if (this.channels.length > 0 && !this.selectedChannelId) {
        const defaultChannel = this.channels[0];
        this.selectedChannelId = defaultChannel.channelId;
        this.selectChannel.emit(defaultChannel);
      }
    });
  }

  listenToUsers(currentUserId: string) {
    const usersRef = collection(this.firestore, 'users');

    this.unsubscribeUsers?.();
    this.unsubscribeUsers = onSnapshot(usersRef, snapshot => {
      const usersArray = snapshot.docs.map(doc =>
        this.markUserName(doc.data() as User, doc.id, currentUserId)
      );
      this.users = this.sortUsers(usersArray, currentUserId);
    });
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

  onSelectChannel(channel: Channel) {
    this.selectedChannelId = channel.channelId;
    this.selectedUserId = null;
    this.selectChannel.emit(channel);
  }

  onSelectUser(user: User) {
    this.selectedUserId = user.id ?? null;
    this.selectedChannelId = null;
    this.selectUser.emit(user);
  }
}