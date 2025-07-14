import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, OnInit, inject, ChangeDetectorRef, Input } from '@angular/core';
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
  @Input() allUsers: User[] = [];
  @Input() currentChannelId?: string;
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<string>();

  userId: string = '';
  mode: 'allChannels' | 'selectedColleagues' | null = null;
  channelList: Channel[] = [];
  channelListVisible = false;
  chosenChannelId?: string;
  chosenChannelName?: string;
  selectedUsers: User[] = [];

  private cdr = inject(ChangeDetectorRef);
  private firestore = inject(Firestore);
  public sharedUser = inject(UserSharedService);

  ngOnInit(): void {
    this.loadAllChannels().then(() => {
      this.setDefaultChannelFromCurrent();
    });
  }

  async loadAllChannels() {
    const snap = await getDocs(collection(this.firestore, 'channels'));
    this.channelList = snap.docs.map(channelItem => ({ id: channelItem.id, ...(channelItem.data() as any) }));
  }

  openChannelList() {
    if (this.mode = 'allChannels') {
      this.channelListVisible = true;
    } else if (this.mode = 'selectedColleagues') {
      this.channelListVisible = false;
    }
  }

  selectChannel(channel: Channel) {
    this.chosenChannelId = channel.channelId;
    this.chosenChannelName = channel.channelName.slice(1);
    this.channelListVisible = false;
  }

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

  onModeChange(newMode: 'allChannels' | 'selectedColleagues') {
    this.mode = newMode;

    if (newMode === 'selectedColleagues') {
      this.channelListVisible = false;
    }
  }

  async saveMember() {
    try {
      const batch = writeBatch(this.firestore);

      if (this.mode === 'allChannels' && this.chosenChannelId) await this.addAllMembersFromChannel(batch);
      else if (this.mode === 'selectedColleagues') await this.addSelectedColleagues(batch);

      await batch.commit();
      this.sharedUser.channelMembersChanged$.next();
      this.closeAddMember();
    } catch (e) {
      console.error('Fehler beim Speichern der Mitglieder:', e);
    }
  }

  private async addAllMembersFromChannel(batch: ReturnType<typeof writeBatch>) {
    const qSnap = await getDocs(query(collection(this.firestore, 'users'),
      where(`channelIds.${this.chosenChannelId}`, '==', true)
    ));

    qSnap.forEach(docSnap => {
      const userRef = doc(this.firestore, 'users', docSnap.id);
      batch.update(userRef, {
        [`channelIds.${this.currentChannelId}`]: true
      });
    });

    this.save.emit('Alle Mitglieder');
  }

  private async addSelectedColleagues(batch: ReturnType<typeof writeBatch>) {
    if (!this.currentChannelId) return;

    this.selectedUsers.forEach(user => {
      const userRef = doc(this.firestore, 'users', user.id!);
      batch.update(userRef, {
        [`channelIds.${this.currentChannelId}`]: true
      });
    });

    const userList = this.selectedUsers
      .map(u => u.displayName || u.name)
      .join(', ');

    this.save.emit(userList);
  }

  closeAddMember() {
    this.close.emit();
  }
}