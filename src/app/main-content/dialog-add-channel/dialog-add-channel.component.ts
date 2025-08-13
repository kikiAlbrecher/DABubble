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

/**
 * Component for adding a new channel.
 * Provides form controls for name and description, checks for duplicates,
 * and persists the new channel to Firestore.
 */
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

  /**
   * Initializes the component and sets up value change subscription for validation
   */
  ngOnInit(): void {
    this.channelNameControl.valueChanges.subscribe(() => {
      if (this.channelExistsError) {
        this.channelExistsError = false;
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Validates and saves a new channel.
   * Ensures the name is valid, checks for duplicates, and handles success or failure.
   */
  async saveChannel(): Promise<void> {
    this.markControlsTouched();
    if (this.channelNameControl.invalid) return;

    try {
      await this.prepareChannelData();

      const exists = await this.checkIfChannelExists();
      if (this.channelAlreadyExists(exists)) return;
      await this.createChannel();
      this.emitSuccess();
    } catch (error) {
      this.emitFailure(error);
    }
  }

  /**
   * Marks form controls as touched and resets error states.
   */
  private markControlsTouched() {
    this.channelNameControl.markAsTouched();
    this.channelExistsError = false;
    this.cdr.markForCheck();
  }

  /**
   * Prepares the channel data from the form controls.
   */
  private async prepareChannelData() {
    this.channel.channelName = this.channelNameControl.value.trim();
    this.channel.channelDescription = this.channelDescriptionControl.value.trim();
    this.channel.channelTimeStamp = new Date().toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    this.channelNameConvention();
  }

  /**
   * Checks if a channel with the same name already exists.
   * 
   * @returns True if a duplicate exists, otherwise false
   */
  private async checkIfChannelExists(): Promise<boolean> {
    const channelsCollection = collection(this.firestore, 'channels');
    return await this.queryChannelNames(channelsCollection);
  }

  /**
   * Handles the case when a channel with the same name already exists.
   *
   * @param {boolean} exists - Whether the channel already exists.
   * @returns {boolean} True if the method handled the case and execution should stop; false otherwise.
   */
  private channelAlreadyExists(exists: boolean): boolean {
    if (!exists) return false;

    this.showErrorHint();
    return true;
  }

  /**
   * Displays the UI error for duplicate channel names.
   */
  showErrorHint() {
    this.channelExistsError = true;
    this.cdr.markForCheck();
  }

  /**
   * Creates the channel and assigns ID and creator.
   */
  private async createChannel() {
    this.channel = await this.channelIdUpdate(this.channel);
  }

  /**
   * Adds a hashtag prefix to the channel name if not present.
   */
  channelNameConvention() {
    this.channel.channelName = this.channel.channelName.trim();
    if (!this.channel.channelName.startsWith('#')) {
      this.channel.channelName = `#${this.channel.channelName}`;
    }
  }

  /**
   * Queries Firestore for existing channels with the same name.
   * 
   * @param channelsCollection Firestore collection reference
   * @returns True if duplicate found
   */
  private async queryChannelNames(channelsCollection: CollectionReference<DocumentData>): Promise<boolean> {
    const q = query(channelsCollection, where('channelName', '==', this.channel.channelName));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  }

  /**
   * Saves the channel to Firestore, sets channelId and channelCreatorId.
   * Also adds the channel to the user's channel list.
   * 
   * @param channel The channel object to update
   * @returns The updated channel
   */
  private async channelIdUpdate(channel: Channel): Promise<Channel> {
    const channelsCollection = collection(this.firestore, 'channels');
    const creatorId = this.userShared.actualUserID;
    const docRef = await addDoc(channelsCollection, { ...channel, channelCreatorId: creatorId });

    await updateDoc(docRef, { channelId: docRef.id });

    await this.addChannelToUser(creatorId, docRef.id);
    channel.channelId = docRef.id;
    channel.channelCreatorId = creatorId;
    return channel;
  }

  /**
   * Adds the created channel to the user's list of channels.
   * Emits a failure event if something goes wrong.
   * 
   * @param userId The ID of the user
   * @param channelId The ID of the newly created channel
   */
  private async addChannelToUser(userId: string, channelId: string): Promise<void> {
    const userDocRef = doc(this.firestore, 'users', userId);

    try {
      const userSnap = await getDoc(userDocRef);
      if (!userSnap.exists()) return;

      const updatedChannelIds = this.getUpdatedChannelIds(userSnap.data(), channelId);
      await this.updateUserChannels(userDocRef, updatedChannelIds);
    } catch (error) {
      this.emitChannelAddFailure();
    }
  }

  /**
   * Updates the user document with new channel IDs.
   * 
   * @param userDocRef Reference to the user's document
   * @param channelIds Updated list of channel IDs
   */
  private async updateUserChannels(userDocRef: any, channelIds: { [key: string]: true }) {
    await updateDoc(userDocRef, { channelIds });
  }

  /**
   * Returns the updated list of channel IDs including the new one.
   * 
   * @param userData User document data
   * @param channelId Channel ID to add
   * @returns Updated map of channel IDs
   */
  private getUpdatedChannelIds(userData: any, channelId: string): { [key: string]: true } {
    const channelIds = userData['channelIds'] || {};
    channelIds[channelId] = true;
    return channelIds;
  }

  /**
   * Emits an error message when adding a channel to the user fails.
   */
  private emitChannelAddFailure(): void {
    this.save.emit({
      success: false,
      message: 'Sorry, da ist etwas schiefgelaufen.'
    });
  }

  /**
   * Emits a success message when the channel was created and saved properly.
   */
  private emitSuccess() {
    this.save.emit({
      success: true,
      message: `Channel ${this.channel.channelName} erfolgreich erstellt!`,
      channel: this.channel
    });
    this.userShared.channelListRefresh$.next();
    this.userShared.lastAddedChannel$.next(this.channel);
  }

  /**
   * Emits a failure message when the channel could not be created.
   * 
   * @param error Error thrown during the process
   */
  private emitFailure(error: unknown) {
    this.save.emit({
      success: false,
      message: `Der Channel konnte nicht erstellt werden: ${error instanceof Error ? error.message : String(error)}`
    });
  }

  /**
   * Emits the close event to close the dialog.
   */
  closeAddChannel() {
    this.close.emit();
  }
}