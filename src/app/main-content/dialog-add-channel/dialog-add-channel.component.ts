import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Firestore, collection, addDoc, query, where, getDocs } from '@angular/fire/firestore';
import { inject } from '@angular/core';
import { Channel } from '../../../models/channel.class';
import { CollectionReference, DocumentData } from 'firebase/firestore';
import { SubmitButtonComponent } from '../../style-components/submit-button/submit-button.component';
import { CloseButtonComponent } from '../../style-components/close-button/close-button.component';

@Component({
  selector: 'app-dialog-add-channel',
  standalone: true,
  imports: [CommonModule, FormsModule, SubmitButtonComponent, CloseButtonComponent],
  templateUrl: './dialog-add-channel.component.html',
  styleUrl: './dialog-add-channel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogAddChannelComponent {
  channel: Channel = new Channel();
  channelExistsError = false;

  private firestore = inject(Firestore);
  private cdr = inject(ChangeDetectorRef);

  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<string>();

  async saveChannel() {
    try {
      this.cdr.detectChanges();
      const channelsCollection = collection(this.firestore, 'channels');
      this.channelNameConvention();

      const exists = await this.queryChannelNames(channelsCollection);
      if (exists) {
        this.channelExistsError = true;
        return;
      }

      await addDoc(channelsCollection, { ...this.channel });
      this.save.emit(this.channel.channelName);
    } catch (error) {
      if (error) return;
    } finally {
      this.cdr.detectChanges();
    }
  }

  private async queryChannelNames(channelsCollection: CollectionReference<DocumentData>): Promise<boolean> {
    const q = query(channelsCollection, where('channelName', '==', this.channel.channelName));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  }

  channelNameConvention() {
    if (!this.channel.channelName.startsWith('#')) {
      this.channel.channelName = `#${this.channel.channelName}`;
    }
  }

  closeAddChannel() {
    this.close.emit();
  }
}