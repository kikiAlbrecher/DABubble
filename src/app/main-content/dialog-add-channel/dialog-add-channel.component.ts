import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Firestore, collection, addDoc, query, where, getDocs } from '@angular/fire/firestore';
import { inject } from '@angular/core';
import { Channel } from '../../../models/channel.class';
import { CollectionReference, doc, DocumentData, getDoc, updateDoc } from 'firebase/firestore';
import { CloseButtonComponent } from '../../style-components/close-button/close-button.component';
import { UserSharedService } from '../../userManagement/userManagement-service';
import { ChannelNameComponent } from '../../style-components/channel-name/channel-name.component';
import { ChannelDescriptionComponent } from '../../style-components/channel-description/channel-description.component';
import { FormControl, Validators } from '@angular/forms';

@Component({
  selector: 'app-dialog-add-channel',
  standalone: true,
  imports: [CommonModule, FormsModule, CloseButtonComponent, ChannelNameComponent,
    ChannelDescriptionComponent],
  templateUrl: './dialog-add-channel.component.html',
  styleUrl: './dialog-add-channel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogAddChannelComponent {
  channelNameControl = new FormControl<string>('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(3)]
  });

  channelDescriptionControl = new FormControl<string>('', {
    nonNullable: true,
  });

  channel: Channel = new Channel();
  channelExistsError = false;

  private firestore = inject(Firestore);
  private cdr = inject(ChangeDetectorRef);
  private userShared = inject(UserSharedService);

  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<Channel>();

  async saveChannel() {
    this.channelNameControl.markAsTouched();
    this.channelExistsError = false;

    if (this.channelNameControl.invalid) {
      this.cdr.detectChanges();
      return;
    }

    try {
      this.cdr.detectChanges();
      this.channel.channelName = this.channelNameControl.value.trim();
      this.channel.channelDescription = this.channelDescriptionControl.value.trim();
      const channelsCollection = collection(this.firestore, 'channels');
      this.channelNameConvention();

      const exists = await this.queryChannelNames(channelsCollection);
      if (exists) {
        this.channelExistsError = true;
        this.cdr.detectChanges();
        return;
      }
      this.channel = await this.channelIdUpdate(this.channel);
      this.save.emit(this.channel);
      // this.userShared.channelChanged$.next();
      // this.userShared.lastAddedChannel$.next(this.channel);
      // this.cdr.detectChanges();
    } catch (error) {
      console.error('Fehler beim Speichern des Channels:', error);
    } finally {
      this.cdr.detectChanges();
    }
  }

  channelNameConvention() {
    this.channel.channelName = this.channel.channelName.trim();
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
      //      this.errorMessage = 'Beim Speichern des Channels ist ein Fehler aufgetreten. Bitte versuche es später nochmal.';
      // this.cdr.detectChanges(); 
    }
  }

  closeAddChannel() {
    this.close.emit();
  }
}