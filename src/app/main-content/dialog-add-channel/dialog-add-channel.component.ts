import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Firestore, collection, addDoc, query, where, getDocs } from '@angular/fire/firestore';
import { inject } from '@angular/core';
import { Channel } from '../../../models/channel.class';
import { CollectionReference, doc, DocumentData, getDoc, updateDoc } from 'firebase/firestore';
import { SubmitButtonComponent } from '../../style-components/submit-button/submit-button.component';
import { CloseButtonComponent } from '../../style-components/close-button/close-button.component';
import { UserSharedService } from '../../userManagement/userManagement-service';

@Component({
  selector: 'app-dialog-add-channel',
  standalone: true,
  imports: [CommonModule, FormsModule, SubmitButtonComponent, CloseButtonComponent],
  templateUrl: './dialog-add-channel.component.html',
  styleUrl: './dialog-add-channel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogAddChannelComponent {
  channel: Channel = new Channel();
  channelExistsError = false;

  private firestore = inject(Firestore);
  private cdr = inject(ChangeDetectorRef);
  private userShared = inject(UserSharedService);

  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<string>();

  async saveChannel() {
    try {
      this.cdr.detectChanges();
      const channelsCollection = collection(this.firestore, 'channels');
      this.channelNameConvention();

      const exists = await this.queryChannelNames(channelsCollection);
      if (exists) {
        this.channelExistsError = true;
        return;
      }
      this.channel = await this.channelIdUpdate(this.channel);
      this.save.emit(this.channel.channelName);
    } catch (error) {
      console.error('Fehler beim Speichern des Channels:', error);
    } finally {
      this.cdr.detectChanges();
    }
  }

  channelNameConvention() {
    if (!this.channel.channelName.startsWith('#')) {
      this.channel.channelName = `#${this.channel.channelName}`;
    }
  }

  private async queryChannelNames(channelsCollection: CollectionReference<DocumentData>): Promise<boolean> {
    const q = query(channelsCollection, where('channelName', '==', this.channel.channelName));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  }

  private async channelIdUpdate(channel: Channel): Promise<Channel> {
    const channelsCollection = collection(this.firestore, 'channels');
    const creatorId = this.userShared.actualUserID;
    const docRef = await addDoc(channelsCollection, { ...channel, channelCreatorId: creatorId });

    await updateDoc(docRef, {
      channelId: docRef.id
    });

    await this.addChannelToUser(creatorId, docRef.id);
    channel.channelId = docRef.id;
    channel.channelCreatorId = creatorId;
    return channel;
  }

  private async addChannelToUser(userId: string, channelId: string) {
    const userDocRef = doc(this.firestore, 'users', userId);

    try {
      const userSnap = await getDoc(userDocRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        const channelIds = userData['channelIds'] || {};

        channelIds[channelId] = true;

        await updateDoc(userDocRef, {
          channelIds
        });
      }
    } catch (error) {
      console.error('Fehler beim Hinzufügen des Channels zum User:', error);
    }
  }

  closeAddChannel() {
    this.close.emit();
  }
}