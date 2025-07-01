import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { SideNavComponent } from './side-nav/side-nav.component';
import { Router } from '@angular/router';
import { UserSharedService } from '../userManagement/userManagement-service';
import { getAuth } from "firebase/auth";
import { StatusMessagesComponent } from '../styles/status-messages/status-messages.component';
import { DialogAddChannelComponent } from './dialog-add-channel/dialog-add-channel.component';
import { SearchbarComponent } from '../header/searchbar/searchbar.component';
import { LogoComponent } from '../header/logo/logo.component';
import { ThreadsComponent } from './threads/threads.component';
import { UserHeaderComponent } from '../header/user-header/user-header.component';
import { MainChatComponent } from './main-chat/main-chat.component';
import { DialogAddMemberComponent } from './dialog-add-member/dialog-add-member.component';

@Component({
  selector: 'app-main-content',
  standalone: true,
  imports: [CommonModule,
    SideNavComponent,
    StatusMessagesComponent,
    DialogAddChannelComponent,
    DialogAddMemberComponent,
    SearchbarComponent,
    LogoComponent,
    MainChatComponent,
    ThreadsComponent,
    UserHeaderComponent
  ],
  templateUrl: './main-content.component.html',
  styleUrl: './main-content.component.scss'
})
export class MainContentComponent {
  constructor(
    public shared: UserSharedService,
    private router: Router,
  ) {
    console.log(shared.actualUser);
  }

  showAddChannelDialog = false;
  showAddMemberDialog = false;
  threadsVisible = false;
  statusMessage = '';
  statusMessageType: 'success' | 'error' = 'success';

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
}