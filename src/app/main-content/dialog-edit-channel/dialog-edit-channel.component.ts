import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, OnInit, inject, ChangeDetectorRef, Input } from '@angular/core';
import { Firestore, collectionData, collection, doc, updateDoc, query, where } from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';
import { CloseButtonComponent } from '../../style-components/close-button/close-button.component';
import { SubmitButtonComponent } from '../../style-components/submit-button/submit-button.component';
import { User } from '../../userManagement/user.interface';
import { Channel } from '../../../models/channel.class';

@Component({
  selector: 'app-dialog-edit-channel',
  standalone: true,
  imports: [CommonModule, FormsModule, SubmitButtonComponent, CloseButtonComponent],
  templateUrl: './dialog-edit-channel.component.html',
  styleUrls: ['./../dialog-add-channel/dialog-add-channel.component.scss', './dialog-edit-channel.component.scss']
})
export class DialogEditChannelComponent {
  @Input() selectedChannel: Channel | null = null;
  @Output() close = new EventEmitter<void>();

  closeEditChannel() {
    this.close.emit();
  }
}
