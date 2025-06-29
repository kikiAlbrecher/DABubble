import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { SideNavComponent } from './side-nav/side-nav.component';
import { Router } from '@angular/router';
import { LogoComponent } from '../logo/logo.component';
import { UserSharedService } from '../userManagement/userManagement-service';
import { getAuth } from "firebase/auth";
import { StatusMessagesComponent } from '../styles/status-messages/status-messages.component';
import { DialogAddChannelComponent } from './dialog-add-channel/dialog-add-channel.component';

@Component({
  selector: 'app-main-content',
  standalone: true,
  imports: [CommonModule, SideNavComponent, LogoComponent, StatusMessagesComponent, DialogAddChannelComponent],
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
  statusMessage = '';
  statusMessageType: 'success' | 'error' = 'success';

  openDialogAddChannel() {
    this.showAddChannelDialog = true;
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
}