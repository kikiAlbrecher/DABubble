import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, OnInit, inject, Input } from '@angular/core';
import { Firestore, collection, doc, query, where, getDocs, writeBatch } from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';
import { CloseButtonComponent } from '../../style-components/close-button/close-button.component';
import { SubmitButtonComponent } from '../../style-components/submit-button/submit-button.component';
import { User } from '../../userManagement/user.interface';
import { Channel } from '../../../models/channel.class';
import { UsersComponent } from '../../style-components/users/users.component';
import { UserImageStatusComponent } from '../../style-components/user-image-status/user-image-status.component';
import { SearchForUserComponent } from '../../style-components/search-for-user/search-for-user.component';
import { UserSharedService } from '../../userManagement/userManagement-service';

@Component({
  selector: 'app-dialog-add-channel-member',
  standalone: true,
  imports: [CommonModule, FormsModule, SubmitButtonComponent, CloseButtonComponent, UsersComponent, UserImageStatusComponent,
    SearchForUserComponent
  ],
  templateUrl: './dialog-add-channel-member.component.html',
  styleUrls: ['./../dialog-add-channel/dialog-add-channel.component.scss', './dialog-add-channel-member.component.scss']
})
export class DialogAddChannelMemberComponent implements OnInit {
  @Input() validUsers: User[] = [];
  @Input() currentChannelId?: string;
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<string>();

  userId: string = '';
  mode: 'allChannels' | 'selectedColleagues' | null = null;
  channelList: Channel[] = [];
  channelListVisible: boolean = false;
  chosenChannelId?: string;
  chosenChannelName?: string;
  selectedUsers: User[] = [];
  isClosing: boolean = false;

  private firestore = inject(Firestore);
  public sharedUser = inject(UserSharedService);

  /**
  * Lifecycle hook that runs on component initialization.
  * Loads all channels and selects the default channel if available.
  */
  ngOnInit(): void {
    this.loadAllChannels().then(() => {
      this.setDefaultChannelFromCurrent();
    });
  }

  /**
   * Checks if the form has a valid selection for saving.
   * @returns True if a valid channel or user selection is made.
   */
  isFormActuallyValid(): boolean {
    if (this.mode === 'allChannels') return !!this.chosenChannelId;
    if (this.mode === 'selectedColleagues') return this.selectedUsers.length > 0;
    return false;
  }

  /**
   * Loads all channels from Firestore and stores them locally.
   */
  async loadAllChannels() {
    const snap = await getDocs(collection(this.firestore, 'channels'));

    this.channelList = snap.docs.map(channelItem => ({ id: channelItem.id, ...(channelItem.data() as any) }));
  }

  /**
   * Opens or closes the channel selection list based on current mode.
   */
  openChannelList() {
    if (this.mode = 'allChannels') this.channelListVisible = true;
    else if (this.mode = 'selectedColleagues') this.channelListVisible = false;
  }

  /**
   * Sets the chosen channel from the selection list.
   * @param channel The selected channel object.
   */
  selectChannel(channel: Channel) {
    this.chosenChannelId = channel.channelId;
    this.chosenChannelName = channel.channelName.slice(1);
    this.channelListVisible = false;
  }

  /**
   * Sets the default selected channel if it matches the currentChannelId.
   */
  setDefaultChannelFromCurrent() {
    if (!this.currentChannelId || this.channelList.length === 0) return;

    const defaultChannel = this.channelList.find(c => c.channelId === this.currentChannelId);
    if (defaultChannel) {
      this.chosenChannelId = defaultChannel.channelId;
      this.chosenChannelName = defaultChannel.channelName.slice(1);
    } else {
      this.chosenChannelName = '#Produktion';
    }
  }

  /**
   * Updates the current selection mode (all users or selected colleagues).
   * @param newMode The selected mode.
   */
  onModeChange(newMode: 'allChannels' | 'selectedColleagues') {
    this.mode = newMode;

    if (newMode === 'selectedColleagues') {
      this.channelListVisible = false;
    }
  }

  /**
   * Saves the members to the current channel based on the selected mode.
   * Uses Firestore batch writes for performance and atomicity.
   */
  async saveMember() {
    try {
      const batch = writeBatch(this.firestore);
      const isAll = this.mode === 'allChannels' && this.chosenChannelId;
      const isSelected = this.mode === 'selectedColleagues';

      if (isAll) await this.addAllMembersFromChannel(batch);
      else if (isSelected) await this.addSelectedColleagues(batch);

      await batch.commit();
      this.afterSave();
    } catch (e) {
      throw new Error('Es ist leider ein Fehler aufgetreten.');
    }
  }

  /**
   * Adds all users from the selected source channel to the current channel.
   * @param batch Firestore batch write instance.
   */
  private async addAllMembersFromChannel(batch: ReturnType<typeof writeBatch>) {
    const usersSnap = await getDocs(query(
      collection(this.firestore, 'users'),
      where(`channelIds.${this.chosenChannelId}`, '==', true)
    ));

    usersSnap.forEach(docSnap => {
      const userRef = doc(this.firestore, 'users', docSnap.id);
      batch.update(userRef, {
        [`channelIds.${this.currentChannelId}`]: true
      });
    });
  }

  /**
   * Adds only the selected colleagues to the current channel.
   * @param batch Firestore batch write instance.
   */
  private async addSelectedColleagues(batch: ReturnType<typeof writeBatch>) {
    if (!this.currentChannelId) return;

    this.selectedUsers.forEach(user => {
      const userRef = doc(this.firestore, 'users', user.id!);
      batch.update(userRef, {
        [`channelIds.${this.currentChannelId}`]: true
      });
    });
  }

  /**
   * Executes final actions after saving: notifies via observables and emits save event.
   */
  private afterSave() {
    this.sharedUser.channelMembersChanged$.next();

    const label = this.mode === 'selectedColleagues'
      ? this.selectedUsers.map(u => u.displayName || u.name).join(', ') : 'Alle Mitglieder';

    this.save.emit(label);
    this.closeAddMember();
  }

  /**
   * Triggers the closing animation and delays the actual close.
   */
  animateCloseAndExit() {
    this.isClosing = true;

    setTimeout(() => this.closeAddMember(), 300);
  }

  /**
   * Emits the close event to notify the parent component.
   */
  closeAddMember() {
    this.close.emit();
  }
}