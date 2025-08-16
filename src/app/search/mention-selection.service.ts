import { Injectable } from '@angular/core';
import { WriteMessageComponent } from '../main-content/write-message/write-message.component';
import { User } from '../userManagement/user.interface';
import { Channel } from '../../models/channel.class';

@Injectable({
  providedIn: 'root'
})
export class MentionSelectionService {
  /**
   * Selects a user for the WriteMessageComponent. 
   * Updates the selected user and resets the selected channel.
   * Also updates the mention input with the selected user's name.
   *
   * @param {WriteMessageComponent} component - The component instance where the selection is made.
   * @param {User} user - The user object to be selected.
   */
  selectUser(component: WriteMessageComponent, user: User) {
    component.selectedUser = user;
    component.selectedChannel = null;
    component.selectedUserId = user.id ?? null;
    component.showUsers = false;
    component.sharedMessages.setSelectedUser(user);

    const fullName = user.displayName || user.name;

    setTimeout(() => component.mentionComponent?.insertMention(`@${fullName}`), 0);
  }

  /**
   * Selects a channel for the WriteMessageComponent.
   * Updates the selected channel and resets the selected user.
   * Also updates the mention input with the selected channel's name.
   *
   * @param {WriteMessageComponent} component - The component instance where the selection is made.
   * @param {Channel} channel - The channel object to be selected.
   */
  selectChannel(component: WriteMessageComponent, channel: Channel) {
    component.selectedChannel = channel;
    component.selectedUser = null;
    component.selectedChannelId = channel.channelId;
    component.showChannels = false;
    component.sharedMessages.setSelectedChannel(channel);

    setTimeout(() => component.mentionComponent?.insertMention(`#${channel.channelName.slice(1)}`), 0);
  }
}