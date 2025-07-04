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

  onSelectChannel(channel: Channel) {
    this.channelSelected.emit(channel);
  }
}