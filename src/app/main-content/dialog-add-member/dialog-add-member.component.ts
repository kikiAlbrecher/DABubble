import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, inject, ChangeDetectorRef, Input } from '@angular/core';
import { Firestore, doc, updateDoc } from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';
import { CloseButtonComponent } from '../../style-components/close-button/close-button.component';
import { SubmitButtonComponent } from '../../style-components/submit-button/submit-button.component';
import { User } from '../../userManagement/user.interface';
import { Channel } from '../../../models/channel.class';
import { SearchForUserComponent } from '../../style-components/search-for-user/search-for-user.component';
import { UserSharedService } from '../../userManagement/userManagement-service';

@Component({
  selector: 'app-dialog-add-member',
  standalone: true,
  imports: [CommonModule, FormsModule, SubmitButtonComponent, CloseButtonComponent, SearchForUserComponent],
  templateUrl: './dialog-add-member.component.html',
  styleUrls: ['./../dialog-add-channel/dialog-add-channel.component.scss', './dialog-add-member.component.scss']
})
export class DialogAddMemberComponent {
  @Input() allUsers: User[] = [];
  @Input() selectedChannel: Channel | null = null;
  @Input() position: { top: number; left: number } = { top: 0, left: 0 };
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<string>();

  userId: string = '';
  selectedUsers: User[] = [];

  private firestore = inject(Firestore);
  private cdr = inject(ChangeDetectorRef);
  public sharedUser = inject(UserSharedService);

  async saveMember() {
    if (!this.selectedChannel?.channelId || this.selectedUsers.length === 0) return;
    const channelId = this.selectedChannel.channelId;

    try {
      for (const user of this.selectedUsers) {
        if (!user.id) continue;
        const userRef = doc(this.firestore, 'users', user.id);
        await updateDoc(userRef, {
          [`channelIds.${channelId}`]: true
        });
      }

      this.sharedUser.channelMembersChanged$.next();
      this.handleDialogCloseAddMember();
    } catch (error) {
      console.error('Fehler beim Hinzufügen der Benutzer zum Channel:', error);
    }
  }

  handleDialogCloseAddMember() {
    this.close.emit();
  }
}