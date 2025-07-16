import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, ViewChild } from '@angular/core';
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
import { DialogShowChannelMembersComponent } from './dialog-show-channel-members/dialog-show-channel-members.component';

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
    DialogShowChannelMembersComponent,
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
export class MainContentComponent implements OnInit {
  constructor(
    public shared: UserSharedService,
    public messageService: MessageSharedService,
    private router: Router,
  ) { }

  users: User[] = [];
  showAddChannelDialog = false;
  addChannelMember = false;
  editChannel = false;
  editChannelPosition = { top: 0, left: 0 };
  showMembers = false;
  showMembersPosition = { top: 0, left: 0 }
  showAddMemberDialog = false;
  addMemberPosition = { top: 0, left: 0 }
  threadsVisible = false;
  statusMessage = '';
  statusMessageType: 'success' | 'error' = 'success';
  selectedChannel: Channel | null = null;
  selectedUser: User | null = null;
  showProfile = false;
  isMobile = false;
  showMainChatMobile = false;
  isInitializing = true;

  @ViewChild(SideNavComponent) sideNavComponent!: SideNavComponent;

  ngOnInit() {
    this.isMobile = window.innerWidth <= 1000;

    if (this.isMobile) this.showMainChatMobile = false;

    this.shared.subscribeValidUsers();

    this.shared.allValidUsers$.subscribe(users => {
      this.users = users;
    });

    setTimeout(() => this.isInitializing = false);
  }

  statusMessageAlternatives(event: { success: boolean; message: string }) {
    this.statusMessageType = event.success ? 'success' : 'error';
    this.statusMessage = event.message;

    setTimeout(() => this.statusMessage = '', 2000);
  }

  onChannelSelected(channel: Channel) {
    this.selectedChannel = channel;
    this.selectedUser = null;
    this.messageService.setSelectedChannel(channel);
    this.messageService.setSelectedUser(null);

    if (this.isMobile && !this.isInitializing) this.showMainChatMobile = true;
  }

  onUserSelected(user: User) {
    this.selectedUser = user;
    this.selectedChannel = null;
    this.messageService.setSelectedUser(user);
    this.messageService.setSelectedChannel(null);

    if (this.isMobile && !this.isInitializing) this.showMainChatMobile = true;
  }

  openDialogAddChannel() {
    this.showAddChannelDialog = true;
  }

  closeDialogAddChannel() {
    this.showAddChannelDialog = false;
  }

  createChannel(event: { success: boolean; message: string; channel?: Channel }) {
    this.statusMessageAlternatives(event);

    if (event.success && event.channel) {
      this.selectedChannel = event.channel;

      setTimeout(() => {
        this.showAddChannelDialog = false;
        this.addChannelMember = true;
      }, 2000);
    } else {
      return;
    }
  }

  closeAddChannelMember() {
    this.addChannelMember = false;
  }

  saveAddChannelMember(userName: string) {
    this.addChannelMember = false;

    this.statusMessageAlternatives({
      success: true,
      message: `${userName} erfolgreich hinzugefügt.`
    });
  }

  openDialogEditChannel(position: { top: number, left: number }): void {
    this.editChannelPosition = position;
    this.editChannel = true;
  }

  saveEditChannel(event: { success: boolean; message: string }) {
    this.statusMessageAlternatives(event);
  }

  updateChannelMember(event: { success: boolean; message: string }) {
    this.editChannel = false;
    this.statusMessageAlternatives(event);
  }

  closeDialogEditChannel() {
    this.editChannel = false;
  }

  openMembers(data: { users: User[]; position: { top: number; left: number } }) {
    this.users = data.users;
    this.showMembers = true;
    this.showMembersPosition = data.position;
  }

  onSelectedUserChanged(user: User | null) {
    this.selectedUser = user;
  }

  closeDialogShowMembers() {
    this.showMembers = false;
  }

  openDialogAddMember(event?: MouseEvent | { top: number; left: number }) {
    let position = { top: 200, left: 0 };

    if (event && 'top' in event && 'left' in event) {
      position = event;
    } else if (event instanceof MouseEvent) {
      position = { top: event.clientY, left: event.clientX };
    }

    this.addMemberPosition = position;
    this.showAddMemberDialog = true;
  }

  saveAddMember(userName: string) {
    this.showAddMemberDialog = false;
    this.statusMessageAlternatives({
      success: true,
      message: `${userName} erfolgreich hinzugefügt.`
    });
  }

  closeDialogAddMember() {
    this.showAddMemberDialog = false;
  }

  openProfile() {
    this.showProfile = true;
  }

  onBackToSideNav() {
    this.showMainChatMobile = false;
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    const width = (event.target as Window).innerWidth;
    const wasMobile = this.isMobile;
    this.isMobile = width <= 1000;

    if (wasMobile !== this.isMobile) {
      this.handleResponsiveChange();
    }

    this.updateOverlayPositions();
  }

  handleResponsiveChange() {
    if (!this.isMobile) {
      this.showMainChatMobile = false;

      setTimeout(() => {
        // this.sideNavComponent?.setDefaultChannelIfNoneSelected();
      });
    }
  }

  private updateOverlayPositions() {
    if (this.editChannel && this.selectedChannel) {
      const trigger = document.querySelector('[data-edit-channel-btn]');
      if (trigger) {
        if (!this.isMobile) {
          this.editChannelPosition = this.calculatePosition(trigger as HTMLElement, 0, 'left');
        } else {
          this.editChannelPosition = { top: 0, left: 0 };
        }
      }
    }

    if (this.showMembers) {
      const trigger = document.querySelector('[data-show-members-btn]');
      if (trigger) this.showMembersPosition = this.calculatePosition(trigger as HTMLElement, 415, 'right');
    }

    if (this.showAddMemberDialog) {
      const trigger = document.querySelector('[data-add-member-btn]');
      if (trigger) this.addMemberPosition = this.calculatePosition(trigger as HTMLElement, 514, 'right');
    }
  }

  private calculatePosition(el: HTMLElement, dialogWidth: number, align: 'left' | 'right' = 'right'): { top: number; left: number } {
    const rect = el.getBoundingClientRect();
    const top = rect.bottom + window.scrollY + 8;
    let left: number;

    (align === 'right') ? left = rect.right + window.scrollX - dialogWidth : left = rect.left + window.scrollX;

    return { top, left };
  }
}