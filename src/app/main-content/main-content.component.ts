import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { SideNavComponent } from './side-nav/side-nav.component';
import { Router } from '@angular/router';
import { UserSharedService } from '../userManagement/userManagement-service';
import { getAuth } from "firebase/auth";
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

@Component({
  selector: 'app-main-content',
  standalone: true,
  imports: [
    CommonModule,
    SideNavComponent,
    StatusMessagesComponent,
    DialogAddChannelComponent,
    DialogAddMemberComponent,
    SearchbarComponent,
    LogoComponent,
    MainChatComponent,
    ThreadsComponent,
    UserHeaderComponent,

  ],
  templateUrl: './main-content.component.html',
  styleUrl: './main-content.component.scss'
})
export class MainContentComponent {
  constructor(
    public shared: UserSharedService,
    public messageService: MessageSharedService,
    private router: Router,
  ) {
    console.log(shared.actualUser);
  }

  showAddChannelDialog = false;
  showAddMemberDialog = false;
  threadsVisible = false;
  statusMessage = '';
  statusMessageType: 'success' | 'error' = 'success';
  selectedChannel: Channel | null = null;
  selectedUser: User | null = null;



  openDialogAddChannel() {
    this.showAddChannelDialog = true;
  }

  openDialogAddMember() {
    this.showAddMemberDialog = true;
  }

  handleChannelCreate(channelName: string) {
    this.showAddChannelDialog = false;
    this.statusMessage = `Channel ${channelName} erfolgreich erstellt!`;
    this.statusMessageType = 'success';

    setTimeout(() => this.statusMessage = '', 2000);
  }

  handleDialogClose() {
    this.showAddChannelDialog = false;
  }

  handleDialogCloseAddMember() {
    this.showAddMemberDialog = false;
  }

  handleMemberAdd(userId: string) {
    this.showAddMemberDialog = false;
    this.statusMessage = `Mitglied erfolgreich hinzugefügt (ID: ${userId})`;
    this.statusMessageType = 'success';
    setTimeout(() => this.statusMessage = '', 2000);
  }

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
}