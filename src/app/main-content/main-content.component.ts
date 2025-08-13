import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, ViewChild } from '@angular/core';
import { SideNavComponent } from './side-nav/side-nav.component';
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
import { HeaderSharedService } from '../header/user-header/header-service';
import { MainContentLayoutService } from './main-content-layout.service';

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
    public sharedHeader: HeaderSharedService,
    private layoutService: MainContentLayoutService
  ) { }

  users: User[] = [];
  channels: Channel[] = [];
  isMobile: boolean = window.innerWidth <= 1000;
  showAddChannelDialog: boolean = false;
  addChannelMember: boolean = false;
  editChannel: boolean = false;
  editChannelPosition = { top: 0, left: 0 };
  isMobileEdit: boolean = false;
  showMembers: boolean = false;
  showMembersPosition = { top: 0, left: 0 }
  showAddMemberDialog: boolean = false;
  addMemberPosition = { top: 0, left: 0 }
  threadsVisible: boolean = false;
  statusMessage = '';
  statusMessageType: 'success' | 'error' = 'success';
  selectedChannel: Channel | null = null;
  selectedUser: User | null = null;
  showProfile: boolean = false;
  showMainChat: boolean = false;
  isInitializing: boolean = true;
  showDevspace: boolean = false;
  userHasMadeSelection: boolean = false;
  public isMobileEditContext: boolean = false;

  @ViewChild(SideNavComponent) sideNavComponent!: SideNavComponent;
  @ViewChild(MainChatComponent) mainChatComponent!: MainChatComponent;

  /**
   * Lifecycle hook that runs on component initialization.
   * Starts the display logic and subscribes to valid users.
   */
  ngOnInit() {
    this.startDisplay();

    this.shared.subscribeValidUsers();

    this.shared.allValidUsers$.subscribe(users => {
      this.users = users;
    });

    this.userHasMadeSelection = false;

    this.sharedHeader.profileOpen$.subscribe(() => {
      this.selectedUser = this.shared.actualUser;
      this.showProfile = true;
    });
  }

  /**
   * Handles initial display state depending on whether the app runs on mobile or desktop.
   */
  startDisplay() {
    if (this.isMobile) {
      this.showMainChat = false;
      this.selectedChannel = null;
      this.selectedUser = null;
      this.isInitializing = false;
    } else {
      setTimeout(() => {
        if (!this.userHasMadeSelection) {
          this.sideNavComponent?.defaultChannel();
          this.showMainChat = true;
        }
        this.isInitializing = false;
      });
    }
  }

  /**
   * Displays a status message based on operation success.
   * Clears the message after a delay.
   * 
   * @param event - Object containing success flag and message text
   */
  statusMessageAlternatives(event: { success: boolean; message: string }) {
    this.statusMessageType = event.success ? 'success' : 'error';
    this.statusMessage = event.message;

    setTimeout(() => this.statusMessage = '', 2500);
  }

  /**
   * Handles selection of a channel by the user.
   * 
   * @param channel - The selected channel
   */
  onChannelSelected(channel: Channel) {
    this.userHasMadeSelection = true;
    this.selectedChannel = channel;
    this.selectedUser = null;
    this.messageService.setSelectedChannel(channel);
    this.messageService.setSelectedUser(null);

    if (this.isMobile && !this.isInitializing) setTimeout(() => this.showMainChat = true);
  }

  /**
   * Handles selection of a user (for direct messaging).
   * 
   * @param user - The selected user
   */
  onUserSelected(user: User) {
    this.userHasMadeSelection = true;
    this.selectedUser = { ...user };
    this.selectedChannel = null;
    this.messageService.setSelectedUser(user);
    this.messageService.setSelectedChannel(null);

    if (this.isMobile && !this.isInitializing) setTimeout(() => this.showMainChat = true);
  }

  /**
   * Opens the dialog to create a new channel.
   */
  openDialogAddChannel() {
    this.showAddChannelDialog = true;
  }

  /**
   * Closes the add-channel dialog.
   */
  closeDialogAddChannel() {
    this.showAddChannelDialog = false;
  }

  /**
   * Handles the result of a channel creation.
   * If successful, opens member add flow.
   * 
   * @param event - Result event containing success flag, message, and optional channel
   */
  createChannel(event: { success: boolean; message: string; channel?: Channel }) {
    this.statusMessageAlternatives(event);

    if (event.success && event.channel) {
      this.selectedChannel = event.channel;

      setTimeout(() => {
        this.showAddChannelDialog = false;
        this.addChannelMember = true;
      }, 2000);
    } else return;
  }

  /**
   * Closes the member-add dialog after channel creation.
   */
  closeAddChannelMember() {
    this.addChannelMember = false;
  }

  /**
   * Saves a newly added member to the channel.
   * 
   * @param userName - The name of the user added to the channel
   */
  saveAddChannelMember(userName: string) {
    this.addChannelMember = false;

    this.statusMessageAlternatives({
      success: true,
      message: `${userName} erfolgreich hinzugefügt.`
    });
  }

  /**
   * Opens the channel editing dialog with a specific position (desktop or mobile).
   * 
   * @param param0 - Contains position of the dialog and a mobile view flag
   */
  openDialogEditChannel({ position, isMobileEdit }: { position: { top: number; left: number }, isMobileEdit: boolean }) {
    this.editChannelPosition = position;
    this.isMobileEdit = isMobileEdit;
    this.editChannel = true;
  }

  /**
   * Saves the edited channel settings.
   * 
   * @param event - Result object with success flag and message
   */
  saveEditChannel(event: { success: boolean; message: string }) {
    this.statusMessageAlternatives(event);
  }

  /**
   * Handles result of a channel member update (e.g. adding/removing users).
   * 
   * @param event - Event object with update result
   */
  updateChannelMember(event: { success: boolean; message: string }) {
    this.editChannel = false;
    this.statusMessageAlternatives(event);
  }

  /**
   * Closes the channel editing dialog.
   */
  closeDialogEditChannel() {
    this.editChannel = false;
  }

  /**
   * Opens a dialog showing members of a channel.
   * 
   * @param data - Contains list of users and position to display the member popup
   */
  openMembers(data: { users: User[]; position: { top: number; left: number } }) {
    this.users = data.users;
    this.showMembers = true;
    this.showMembersPosition = data.position;
  }

  /**
   * Updates the selected user in the component state.
   * 
   * @param user - The selected user or null
   */
  onSelectedUserChanged(user: User | null) {
    this.selectedUser = user;
  }

  /**
   * Closes the dialog that shows channel members.
   */
  closeDialogShowMembers() {
    this.showMembers = false;
  }

  /**
   * Opens the selected user's profile and updates the state accordingly.
   * 
   * @param user - The user whose profile should be shown.
   */
  onOpenUserProfile(user: User) {
    if (this.sideNavComponent) this.sideNavComponent.onSelectUser(user);

    this.selectedUser = user;
    this.editChannel ? this.selectedChannel = this.selectedChannel : this.selectedChannel = null;

    setTimeout(() => this.openProfile(), 10);
  }

  /**
   * Opens the "Add Member" dialog and positions it based on the triggering event or coordinates.
   * Adjusts behavior depending on whether the application is in mobile or desktop view.
   *
   * @param event - Optional event or position object. Can be a MouseEvent (used for positioning
   *                based on click) or an object with explicit `top` and `left` coordinates.
   */
  openDialogAddMember(event?: MouseEvent | { top: number; left: number }): void {
    this.isMobileEditContext = false;
    const position = this.extractPosition(event);

    this.isMobile ? this.mobileAddMember(position) : this.desktopAddMember(position);
  }

  /**
   * Extracts the position from a MouseEvent or explicit coordinates.
   */
  private extractPosition(event?: MouseEvent | { top: number; left: number }): { top: number; left: number } {
    if (event && 'top' in event && 'left' in event) return event;
    if (event instanceof MouseEvent) return { top: event.clientY, left: event.clientX };

    return { top: 200, left: 0 };
  }

  /**
   * Handles opening the add member dialog on mobile.
   */
  private mobileAddMember(position: { top: number; left: number }): void {
    this.addMemberPosition = position;
    this.showAddMemberDialog = false;
    this.showMembers = true;

    setTimeout(() => {
      this.showMembers = false;
      this.showAddMemberDialog = true;
    }, 50);
  }

  /**
   * Handles opening the add member dialog on desktop.
   */
  private desktopAddMember(position: { top: number; left: number }): void {
    this.addMemberPosition = position;
    this.showAddMemberDialog = true;
  }

  /**
   * Opens the "Add Member" dialog in mobile edit mode in context of the edit-channel-dialog.
   */
  openDialogAddMemberMobile() {
    if (this.isMobile) {
      this.isMobileEdit = true;
      this.isMobileEditContext = true;
      this.showAddMemberDialog = true;
    }
  }

  /**
   * Handles saving a newly added member.
   * 
   * @param event - Contains success flag, message, and the name of the added user
   */
  saveAddMember(event: { success: boolean; message: string; userName: string }) {
    this.showAddMemberDialog = false;
    this.statusMessageAlternatives(event);
  }

  /**
   * Closes the add-member dialog.
   */
  closeDialogAddMember() {
    this.showAddMemberDialog = false;
  }

  /**
   * Opens the user profile view.
   */
  openProfile() {
    this.showProfile = true;
  }

  /**
   * Initiates sending a message to the given user.
   * Sets up the chat context accordingly.
   * 
   * @param user - The user to send a message to
   */
  sendUserMessage(user: User) {
    this.selectedUser = user;
    this.selectedChannel = null;
    this.messageService.setSelectedUser(user);
    this.messageService.setSelectedChannel(null);
    this.showProfile = false;

    if (this.isMobile && this.editChannel) this.editChannel = false;
    if (this.isMobile && !this.isInitializing) this.showMainChat = true;

    setTimeout(() => {
      if (this.mainChatComponent) this.mainChatComponent.focusWriteMessageInput();
    }, 30);
  }

  /**
   * Handles the navigation back from main chat to side nav (mobile only).
   */
  onBackToSideNav() {
    this.showMainChat = false;
    this.showDevspace = false;
  }

  /**
   * Responds to window resize events.
   * Updates mobile/desktop layout logic and overlay positions.
   * 
   * @param event - The resize event
   */
  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    const width = (event.target as Window).innerWidth;
    const wasMobile = this.isMobile;
    this.isMobile = width <= 1000;

    if (wasMobile !== this.isMobile) {
      this.layoutService.handleResponsiveChange(this);
      this.layoutService.handleEditChannel(this);
    }

    this.layoutService.updateOverlayPositions(this);
  }

  /**
   * Opens the devspace (desktop).
   */
  onOpenDevspace() {
    this.showDevspace = true;
  }

  /**
   * Closes the devspace (desktop).
   */
  onCloseDevspace() {
    this.showDevspace = false;
  }

  /**
   * Toggles the Devspace visibility based on the current device type (mobile or desktop).
   * On mobile, handles more complex logic depending on selection and chat visibility.
   */
  toggleDevspaceMobile(): void {
    this.isMobile ? this.toggleMobileDevspace() : this.showDevspace = !this.showDevspace;
  }

  /**
   * Toggles the Devspace on mobile view.
   * Opens the Devspace if the main chat is not shown, otherwise closes it.
   */
  private toggleMobileDevspace(): void {
    if (!this.showMainChat) {
      this.prepareMobileDevspaceOpening();
    } else {
      this.closeMobileDevspace();
    }
  }

  /**
   * Prepares and opens the Devspace in mobile view.
   * Ensures a channel is selected before showing the Devspace.
   */
  private prepareMobileDevspaceOpening(): void {
    if (!this.selectedChannel || !this.selectedUser) this.selectDefaultChannel();

    this.showMainChat = true;

    setTimeout(() => this.showDevspace = true, 0);
  }

  /**
   * Closes the Devspace and resets the current selection in mobile view.
   */
  private closeMobileDevspace(): void {
    this.showMainChat = false;
    this.selectedUser = null;
    this.selectedChannel = null;

    setTimeout(() => this.showDevspace = false, 0);
  }

  /**
   * Selects the default channel using the side navigation component.
   * Updates the selectedChannel property based on the selectedChannelId.
   */
  private selectDefaultChannel(): void {
    this.sideNavComponent?.defaultChannel();

    this.selectedChannel =
      this.sideNavComponent?.channels.find(c => c.channelId === this.sideNavComponent?.selectedChannelId) || null;
  }

  /**
   * Handles result feedback from a mail search operation.
   * 
   * @param event - Result event with success flag and message
   */
  onSearchMail(event: { success: boolean; message: string }) {
    this.statusMessageAlternatives(event);
  }

  /**
 * Ensures main chat is visible when search is initiated (especially on mobile).
 */
  onSearchStarted() {
    if (this.isMobile) {
      setTimeout(() => {
        this.showMainChat = true;
      }, 30);
    }
  }
}