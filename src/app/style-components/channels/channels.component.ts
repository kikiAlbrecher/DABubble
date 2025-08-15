import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Channel } from '../../../models/channel.class';

@Component({
  selector: 'app-channels',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './channels.component.html',
  styleUrls: ['./channels.component.scss']
})
export class ChannelsComponent {
  @Input() channels: Channel[] = [];
  @Input() selectedChannelId: string | null = null;
  @Output() channelSelected = new EventEmitter<Channel>();

  /**
   * Emits the channel that was selected.
   * 
   * @param channel The channel selected by the user.
   */
  onSelectChannel(channel: Channel) {
    this.channelSelected.emit(channel);
  }

  /**
   * Tracking function used by Angular's `*ngFor` directive to optimize rendering.
   * 
   * Returns the `channelId` of the channel as a unique identifier, allowing Angular to track items in the list efficiently.
   * 
   * @param {number} index - The index of the item in the iterable.
   * @param {Channel} channel - The channel object for the current item.
   * @returns {string} A unique identifier for tracking the channel.
   */
  trackByChannel(index: number, channel: Channel): string {
    return channel.channelId;
  }
}