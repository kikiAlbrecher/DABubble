import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, OnInit, inject, ChangeDetectorRef, Input } from '@angular/core';
import { Firestore, collectionData, collection, doc, updateDoc } from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';
import { CloseButtonComponent } from '../../style-components/close-button/close-button.component';
import { SubmitButtonComponent } from '../../style-components/submit-button/submit-button.component';
import { User } from '../../userManagement/user.interface';
import { Channel } from '../../../models/channel.class';
import { ChannelUsersService } from '../../userManagement/channel-users.service';
import { UserSharedService } from '../../userManagement/userManagement-service';

@Component({
  selector: 'app-dialog-edit-channel',
  standalone: true,
  imports: [CommonModule, FormsModule, SubmitButtonComponent, CloseButtonComponent],
  templateUrl: './dialog-edit-channel.component.html',
  styleUrls: ['./../dialog-add-channel/dialog-add-channel.component.scss', './dialog-edit-channel.component.scss']
})
export class DialogEditChannelComponent implements OnInit {
  channelMembers: User[] = [];
  creatorName: string = '';

  @Input() selectedChannel: Channel | null = null;
  @Input() position: { top: number; left: number } = { top: 0, left: 0 };
  @Output() close = new EventEmitter<void>();
  @Output() userLeftChannel = new EventEmitter<void>();

  private firestore = inject(Firestore);
  private channelUsersService = inject(ChannelUsersService);
  public sharedUser = inject(UserSharedService);

  async ngOnInit() {
    if (!this.selectedChannel) return;

    const allUsers = await this.channelUsersService.getUsersForChannel(this.selectedChannel.channelId);
    const creator = allUsers.find(user => user.id === this.selectedChannel?.channelCreatorId);

    if (creator) {
      this.creatorName = creator.name;
    }
  }

  leaveChannel() {
    if (!this.selectedChannel) return;

    const userId = this.sharedUser.actualUserID;
    const channelId = this.selectedChannel.channelId;

    this.sharedUser.removeChannelUser(userId, channelId)
      .then(() => {
        this.sharedUser.channelMembersChanged$.next();
        this.sharedUser.channelChanged$.next();
        this.userLeftChannel.emit();
        this.closeEditChannel();
      })
      .catch(error => {
        console.error("Fehler beim Verlassen des Channels:", error);
      });
  }

  closeEditChannel() {
    this.close.emit();
  }
}
