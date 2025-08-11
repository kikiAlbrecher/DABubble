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
  styleUrls: ['./../dialog-add-channel/dialog-add-channel.component.scss',
    './../dialog-add-channel-member/dialog-add-channel-member.component.scss',
    './dialog-add-member.component.scss']
})
export class DialogAddMemberComponent {
  @Input() validUsers: User[] = [];
  @Input() selectedChannel: Channel | null = null;
  @Input() position: { top: number; left: number } = { top: 0, left: 0 };
  @Input() asOverlay: boolean = true;
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<{ success: boolean; message: string; userName: string }>();

  userId: string = '';
  selectedUsers: User[] = [];
  isClosing: boolean = false;

  private firestore = inject(Firestore);
  private cdr = inject(ChangeDetectorRef);
  public sharedUser = inject(UserSharedService);

  /**
   * Checks if the form is valid (at least one user selected).
   * @returns `true` if there are selected users.
   */
  isFormActuallyValid(): boolean {
    if (this.selectedUsers.length > 0) return true;

    return false;
  }

  /**
  * Saves selected users to the Firestore channel by updating their documents.
   * Also emits success or failure events and closes the dialog.
   */
  async saveMember() {
    const channelId = this.selectedChannel?.channelId;
    const users = this.selectedUsers;

    if (!channelId || users.length === 0) return;

    try {
      const addedUserNames = await this.updateUsersFirestore(channelId, users);
      this.sharedUser.channelMembersChanged$.next();
      this.emitSuccessMsg(addedUserNames);
      this.handleDialogCloseAddMember();
    } catch (error) {
      this.emitFailure();
    }
  }

  /**
   * Adds the selected users to the given channel in Firestore.
   * @param channelId The ID of the channel to update.
   * @param users List of users to be added.
   * @returns Array of user names that were successfully added.
   */
  private async updateUsersFirestore(channelId: string, users: User[]): Promise<string[]> {
    const addedNames: string[] = [];

    for (const user of users) {
      if (!user.id) continue;

      const userRef = doc(this.firestore, 'users', user.id);
      await updateDoc(userRef, { [`channelIds.${channelId}`]: true });
      addedNames.push(user.name);
    }

    return addedNames;
  }

  /**
   * Emits a success message with the names of the added users.
   * @param userNames Array of added user names.
   */
  private emitSuccessMsg(userNames: string[]) {
    if (userNames.length === 0) return;

    const nameList = userNames.join(', ');
    const verb = userNames.length === 1 ? 'wurde' : 'wurden';
    const message = `${nameList} ${verb} zum Channel hinzugefügt.`;

    this.save.emit({ success: true, message, userName: nameList });
  }

  /**
   * Emits a generic failure message when an error occurs during saving.
   */
  private emitFailure() {
    this.save.emit({ success: false, message: 'Leider ist ein Fehler aufgetreten.', userName: '' });
  }

  /**
 * Triggers the closing animation and delays the actual close.
 */
  animateCloseAndExit() {
    this.isClosing = true;

    setTimeout(() => this.handleDialogCloseAddMember(), 300);
  }

  /**
   * Closes the dialog and emits the `close` event.
   */
  handleDialogCloseAddMember() {
    this.close.emit();
  }
}