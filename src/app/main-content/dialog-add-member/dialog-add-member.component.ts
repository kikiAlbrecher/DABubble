import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { Firestore, collectionData, collection, doc, updateDoc, query, where } from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';
import { CloseButtonComponent } from '../../style-components/close-button/close-button.component';
import { SubmitButtonComponent } from '../../style-components/submit-button/submit-button.component';
import { User } from '../../userManagement/user.interface';

@Component({
  selector: 'app-dialog-add-member',
  standalone: true,
  imports: [CommonModule, FormsModule, SubmitButtonComponent, CloseButtonComponent],
  templateUrl: './dialog-add-member.component.html',
  styleUrls: ['./../dialog-add-channel/dialog-add-channel.component.scss', './dialog-add-member.component.scss']
})
export class DialogAddMemberComponent {
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<string>();

  userId: string = '';

  private cdr = inject(ChangeDetectorRef);

  async saveMember() {
    if (!this.userId || this.userId.length < 3) return;
    this.save.emit(this.userId);
    this.cdr.detectChanges();
  }

  closeAddMember() {
    this.close.emit();
  }
}