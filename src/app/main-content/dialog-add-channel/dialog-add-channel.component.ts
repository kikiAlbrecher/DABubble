import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, OnInit, Output } from '@angular/core';
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
export class DialogAddChannelComponent implements OnInit {
  channelNameControl = new FormControl<string>('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(3), Validators.maxLength(15)]
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
  @Output() save = new EventEmitter<{ success: boolean; message: string; channel?: Channel }>();

  ngOnInit(): void {
    this.channelNameControl.valueChanges.subscribe(() => {
      if (this.channelExistsError) {
        this.channelExistsError = false;
        this.cdr.detectChanges();
      }
    });
  }

  async saveChannel() {
    this.markControlsTouched();

    if (this.channelNameControl.invalid) return;

    try {
      await this.prepareChannelData();

      const exists = await this.checkIfChannelExists();
      if (exists) {
        this.channelExistsError = true;
        this.cdr.detectChanges();
        return;
      }

      await this.createChannel();
      this.emitSuccess();
    } catch (error) {
      this.emitFailure(error);
    } finally {
      this.cdr.detectChanges();
    }
  }

  private markControlsTouched() {
    this.channelNameControl.markAsTouched();
    this.channelExistsError = false;
    this.cdr.detectChanges();
  }

  private async prepareChannelData() {
    this.channel.channelName = this.channelNameControl.value.trim();
    this.channel.channelDescription = this.channelDescriptionControl.value.trim();
    this.channel.channelTimeStamp = new Date().toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    this.channelNameConvention();
  }

  private async checkIfChannelExists(): Promise<boolean> {
    const channelsCollection = collection(this.firestore, 'channels');
    return await this.queryChannelNames(channelsCollection);
  }

  private async createChannel() {
    this.channel = await this.channelIdUpdate(this.channel);
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
      this.save.emit({
        success: false,
        message: 'Beim Speichern des Channels ist ein Fehler aufgetreten.'
      });
    }
  }

  private emitSuccess() {
    this.save.emit({
      success: true,
      message: `Channel ${this.channel.channelName} erfolgreich erstellt!`,
      channel: this.channel
    });
    this.userShared.channelListRefresh$.next();
    this.userShared.lastAddedChannel$.next(this.channel);
  }

  private emitFailure(error: unknown) {
    this.save.emit({
      success: false,
      message: `Der Channel konnte nicht erstellt werden: ${error instanceof Error ? error.message : String(error)}`
    });
  }

  closeAddChannel() {
    this.close.emit();
  }
}