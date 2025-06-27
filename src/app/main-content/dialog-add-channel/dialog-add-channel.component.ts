import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Firestore, collection, addDoc } from '@angular/fire/firestore';
import { inject } from '@angular/core';
import { Channel } from '../../../models/channel.class';

@Component({
  selector: 'app-dialog-add-channel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dialog-add-channel.component.html',
  styleUrl: './dialog-add-channel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogAddChannelComponent {
  channel: Channel = new Channel();

  private firestore = inject(Firestore);
  private cdr = inject(ChangeDetectorRef);

  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<string>();

  async saveChannel() {
    try {
      this.cdr.detectChanges();
      const channelsCollection = collection(this.firestore, 'channels');

      this.channelNameConvention();

      const result = await addDoc(channelsCollection, { ...this.channel });
      console.log('Adding channel finished', result);
      this.save.emit(this.channel.channelName);
    } catch (error) {
      console.error('Error adding channel:', error);
    } finally {
      this.cdr.detectChanges();
    }
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
