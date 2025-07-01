import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { Firestore, collectionData, collection, doc, updateDoc, query, where } from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';
import { CloseButtonComponent } from '../../styles/close-button/close-button.component';
import { SubmitButtonComponent } from '../../styles/submit-button/submit-button.component';
import { User } from '../../userManagement/user.interface';

@Component({
  selector: 'app-dialog-add-member',
  standalone: true,
  imports: [CommonModule, FormsModule, SubmitButtonComponent, CloseButtonComponent],
  templateUrl: './dialog-add-member.component.html',
  styleUrls: ['./../dialog-add-channel/dialog-add-channel.component.scss', './dialog-add-member.component.scss']
})
export class DialogAddMemberComponent {
  users: User[] = [];
  selectedUserId: string | null = null;

  private firestore = inject(Firestore);

  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<string>();

  ngOnInit() {
    const usersCollection = collection(this.firestore, 'users');
    // collectionData(usersCollection, { idField: 'id' }).subscribe(users => this.users = users);
  }

  async addMember() {
    if (!this.selectedUserId) return;

    // Update Channel Mitglieder hier, z.B. via updateDoc
    // this.save.emit(this.selectedUserId);
  }

  closeAddMember() {
    this.close.emit();
  }
}