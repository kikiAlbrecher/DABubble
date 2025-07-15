import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, OnInit, inject, Input } from '@angular/core';
import { Firestore, collection, doc, updateDoc, query, where, getDocs } from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';
import { CloseButtonComponent } from '../../style-components/close-button/close-button.component';
import { User } from '../../userManagement/user.interface';
import { Channel } from '../../../models/channel.class';
import { ChannelUsersService } from '../../userManagement/channel-users.service';
import { UserSharedService } from '../../userManagement/userManagement-service';
import { ChannelNameComponent } from '../../style-components/channel-name/channel-name.component';
import { ChannelDescriptionComponent } from '../../style-components/channel-description/channel-description.component';
import { FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { DialogShowChannelMembersComponent } from '../dialog-show-channel-members/dialog-show-channel-members.component';

@Component({
  selector: 'app-dialog-edit-channel',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, CloseButtonComponent, ChannelNameComponent,
    ChannelDescriptionComponent, DialogShowChannelMembersComponent],
  templateUrl: './dialog-edit-channel.component.html',
  styleUrls: ['./../dialog-add-channel/dialog-add-channel.component.scss', './dialog-edit-channel.component.scss']
})
export class DialogEditChannelComponent implements OnInit {
  channelNameControl = new FormControl<string>('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(3), Validators.maxLength(15)]
  });

  channelDescriptionControl = new FormControl<string>('', {
    nonNullable: true
  });

  channelMembers: User[] = [];
  creatorName: string = '';
  isEditingName: boolean = false;
  isEditingDescription: boolean = false;
  channelExistsError: boolean = false;
  selectedUserId: string | null = null;

  @Input() selectedChannel: Channel | null = null;
  @Input() position: { top: number; left: number } = { top: 0, left: 0 };
  @Output() close = new EventEmitter<void>();
  @Output() userLeftChannel = new EventEmitter<{ success: boolean; message: string }>();
  @Output() saveName = new EventEmitter<{ success: boolean; message: string }>();
  @Output() saveDescription = new EventEmitter<{ success: boolean; message: string }>();

  private firestore = inject(Firestore);
  private channelUsersService = inject(ChannelUsersService);
  public sharedUser = inject(UserSharedService);

  ngOnInit(): void {
    if (!this.selectedChannel) return;

    this.channelNameControl.setValue(this.selectedChannel.channelName.replace(/^#/, ''));
    this.channelDescriptionControl.setValue(this.selectedChannel.channelDescription || '');

    this.channelNameControl.valueChanges.subscribe(() => {
      this.channelExistsError = false;
    });

    this.loadCreatorName();
    this.loadChannelMembers();
  }

  private async loadCreatorName() {
    if (!this.selectedChannel) return;

    const validUsers = await this.channelUsersService.getUsersForChannel(this.selectedChannel.channelId);
    const creator = validUsers.find(user => user.id === this.selectedChannel?.channelCreatorId);

    if (creator) {
      this.creatorName = creator.name;
    }
  }

  async saveEditName() {
    if (!this.selectedChannel) return;

    this.channelNameControl.markAsTouched();

    if (this.channelNameControl.invalid) return this.invalidName();

    const updatedName = this.formatChannelName(this.channelNameControl.value);

    if (updatedName === this.selectedChannel.channelName) return this.noNameChanges();

    const isDuplicate = await this.checkForNameDuplicates(updatedName);

    if (isDuplicate) return this.duplicateName();

    await this.updateChannelName(updatedName);
  }

  invalidName() {
    this.saveName.emit({ success: false, message: 'Der Channel-Name ist ungültig.' });
    return;
  }

  noNameChanges() {
    this.saveName.emit({ success: true, message: 'Keine Änderungen.' });
    this.isEditingName = false;
    return;
  }

  duplicateName() {
    this.channelExistsError = true;
    return;
  }

  private async checkForNameDuplicates(updatedName: string): Promise<boolean> {
    if (updatedName === this.selectedChannel?.channelName) return false;

    return await this.queryNameDuplicates(updatedName);
  }

  private async queryNameDuplicates(updatedName: string): Promise<boolean> {
    const channelsCollection = collection(this.firestore, 'channels');
    const q = query(channelsCollection, where('channelName', '==', updatedName));
    const result = await getDocs(q);
    return !result.empty;
  }

  private async updateChannelName(name: string): Promise<void> {
    try {
      const docRef = doc(this.firestore, 'channels', this.selectedChannel!.channelId);
      await updateDoc(docRef, { channelName: name });

      this.selectedChannel!.channelName = name;
      this.channelExistsError = false;
      this.saveName.emit({ success: true, message: 'Der Channel-Name wurde erfolgreich geändert.' });
      this.isEditingName = false;
    } catch (error) {
      this.saveName.emit({ success: false, message: 'Der Channel-Name konnte nicht geändert werden.' });
    }
  }

  private formatChannelName(name: string): string {
    name = name.trim();

    return name.startsWith('#') ? name : `#${name}`;
  }

  async saveEditDescription() {
    if (!this.selectedChannel) return;

    const updatedDescription = this.getTrimmedDescription();

    if (updatedDescription === this.selectedChannel.channelDescription) return this.noDescriptionChanges();

    await this.updateChannelDescription(updatedDescription);
  }

  noDescriptionChanges() {
    this.saveDescription.emit({ success: true, message: 'Keine Änderungen.' });
    this.isEditingDescription = false;
    return;
  }

  private getTrimmedDescription(): string {
    return this.channelDescriptionControl.value.trim();
  }

  private async updateChannelDescription(description: string): Promise<void> {
    try {
      const docRef = doc(this.firestore, 'channels', this.selectedChannel!.channelId);
      await updateDoc(docRef, { channelDescription: description });

      this.selectedChannel!.channelDescription = description;
      this.saveDescription.emit({ success: true, message: 'Die Channel-Beschreibung wurde geändert.' });
      this.isEditingDescription = false;
    } catch (error) {
      this.saveDescription.emit({ success: false, message: 'Ups, da ist etwas schiefgelaufen. Bitte versuche es noch einmal.' });
    }
  }

  private async loadChannelMembers(): Promise<void> {
    if (!this.selectedChannel) return;

    const users = await this.channelUsersService.getUsersForChannel(this.selectedChannel.channelId);
    this.channelMembers = users;
  }

  leaveChannel() {
    if (!this.selectedChannel) return;

    const userId = this.sharedUser.actualUserID;
    const channelId = this.selectedChannel.channelId;

    this.sharedUser.removeChannelUser(userId, channelId)
      .then(() => {
        this.sharedUser.channelMembersChanged$.next();
        // this.sharedUser.channelListRefresh$.next();
        this.userLeftChannel.emit({ success: true, message: 'Du wurdest ausgetragen.' });
      })
      .catch(error => {
        this.userLeftChannel.emit({ success: false, message: 'Du konntest nicht ausgetragen werden, weil ' + error });
      });
  }

  closeEditChannel() {
    this.close.emit();
  }
}