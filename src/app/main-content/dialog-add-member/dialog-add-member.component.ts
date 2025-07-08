import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, OnInit, inject, ChangeDetectorRef, Input } from '@angular/core';
import { Firestore, collectionData, collection, doc, updateDoc, query, where } from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';
import { CloseButtonComponent } from '../../style-components/close-button/close-button.component';
import { SubmitButtonComponent } from '../../style-components/submit-button/submit-button.component';
import { User } from '../../userManagement/user.interface';
import { Channel } from '../../../models/channel.class';
import { SearchForUserComponent } from '../../style-components/search-for-user/search-for-user.component';

@Component({
  selector: 'app-dialog-add-member',
  standalone: true,
  imports: [CommonModule, FormsModule, SubmitButtonComponent, CloseButtonComponent, SearchForUserComponent],
  templateUrl: './dialog-add-member.component.html',
  styleUrls: ['./../dialog-add-channel/dialog-add-channel.component.scss', './dialog-add-member.component.scss']
})
export class DialogAddMemberComponent {
  @Input() selectedChannel: Channel | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<string>();

  userId: string = '';
  selectedUsers: User[] = [];

  private firestore = inject(Firestore);
  private cdr = inject(ChangeDetectorRef);

  async saveMember() {
    if (!this.userId || this.userId.length < 3) return;
    this.save.emit(this.userId);
    this.cdr.detectChanges();
  }

  handleDialogCloseAddMember() {
    this.close.emit();
  }
}