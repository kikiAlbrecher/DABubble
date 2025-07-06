import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { SideNavComponent } from './side-nav/side-nav.component';
import { Router } from '@angular/router';
import { UserSharedService } from '../userManagement/userManagement-service';
import { StatusMessagesComponent } from '../style-components/status-messages/status-messages.component';
import { DialogAddChannelComponent } from './dialog-add-channel/dialog-add-channel.component';
import { SearchbarComponent } from '../header/searchbar/searchbar.component';
import { LogoComponent } from '../header/logo/logo.component';
import { ThreadsComponent } from './threads/threads.component';
import { UserHeaderComponent } from '../header/user-header/user-header.component';
import { MainChatComponent } from './main-chat/main-chat.component';
import { DialogAddMemberComponent } from './dialog-add-member/dialog-add-member.component';
import { Channel } from '../../models/channel.class';
import { User } from '../userManagement/user.interface';
import { MessageSharedService } from './message-service';
import { DialogAddChannelMemberComponent } from './dialog-add-channel-member/dialog-add-channel-member.component';
import { DialogEditChannelComponent } from './dialog-edit-channel/dialog-edit-channel.component';
import { UserProfileComponent } from '../header/user-profile/user-profile.component';

@Component({
  selector: 'app-main-content',
  standalone: true,
  imports: [
    CommonModule,
    SideNavComponent,
    StatusMessagesComponent,
    DialogAddChannelComponent,
    DialogAddChannelMemberComponent,
    DialogAddMemberComponent,
    DialogEditChannelComponent,
    SearchbarComponent,
    LogoComponent,
    MainChatComponent,
    ThreadsComponent,
    UserHeaderComponent,
    UserProfileComponent
  ],
  templateUrl: './main-content.component.html',
  styleUrls: ['./main-content.component.scss']
})
export class MainContentComponent {
  constructor(
    public shared: UserSharedService,
    public messageService: MessageSharedService,
    private router: Router,
  ) { }

  showAddChannelDialog = false;
  addChannelMember = false;
  showAddMemberDialog = false;
  editChannel = false;
  threadsVisible = false;
  statusMessage = '';
  statusMessageType: 'success' | 'error' = 'success';
  selectedChannel: Channel | null = null;
  selectedUser: User | null = null;
  showProfile = false;

  onChannelSelected(channel: Channel) {
    this.selectedChannel = channel;
    this.selectedUser = null;
    this.messageService.setSelectedChannel(channel);
    this.messageService.setSelectedUser(null);
  }

  onUserSelected(user: User) {
    this.selectedUser = user;
    this.selectedChannel = null;
    this.messageService.setSelectedUser(user);
    this.messageService.setSelectedChannel(null);
  }

  openDialogAddChannel() {
    this.showAddChannelDialog = true;
  }

  closeDialogAddChannel() {
    this.showAddChannelDialog = false;
  }

  createChannel(channel: Channel) {
    this.showAddChannelDialog = false;
    this.selectedChannel = channel;
    this.statusMessageType = 'success';
    this.statusMessage = `Channel ${channel.channelName} erfolgreich erstellt!`;

    setTimeout(() => {
      this.statusMessage = '';
      this.addChannelMember = true;
    }, 2000);
  }

  closeAddChannelMember() {
    this.addChannelMember = false;
  }

  saveAddChannelMember(userName: string) {
    this.addChannelMember = false;
    this.statusMessageType = 'success';
    this.statusMessage = `${userName} erfolgreich hinzugefügt.`;

    setTimeout(() => this.statusMessage = '', 2000);
  }

  openDialogAddMember() {
    this.showAddMemberDialog = true;
  }

  closeDialogAddMember() {
    this.showAddMemberDialog = false;
  }

  openDialogEditChannel() {
    this.editChannel = true;
  }

  closeDialogEditChannel() {
    this.editChannel = false;
  }

  openProfile() {
    this.showProfile = true;
  }
}