import { Injectable } from '@angular/core';
import { User } from '../userManagement/user.interface';
import { Channel } from '../../models/channel.class';

@Injectable({
  providedIn: 'root'
})
export class MentionHandlerService {
  /**
   * Handles a selected mention from the editor input and 
   * dispatches the appropriate emit function based on whether it's a user or channel mention.
   *
   * @param {string} mention - The mention string (e.g. '@alice' or '#general').
   * @param {User[]} users - A list of available users to match against.
   * @param {Channel[]} channels - A list of available channels to match against.
   * @param {(mention: string) => void} insertMentionFn - Function to insert the mention into the editor.
   * @param {(user: User) => void} emitUserFn - Function to emit the selected user.
   * @param {(channel: Channel) => void} emitChannelFn - Function to emit the selected channel.
   * @param {() => void} [syncFn] - Optional function to synchronize the editor state after insertion.
   */
  handleMentionSelected(mention: string, users: User[], channels: Channel[], insertMentionFn: (mention: string) => void,
    emitUserFn: (user: User) => void, emitChannelFn: (channel: Channel) => void, syncFn?: () => void): void {
    insertMentionFn(mention);
    syncFn?.();

    if (mention.startsWith('@')) this.handleUserMention(mention, users, emitUserFn);
    else if (mention.startsWith('#')) this.handleChannelMention(mention, channels, emitChannelFn);
  }

  /**
   * Handles a user mention by matching the username and emitting the corresponding user.
   *
   * @param {string} mention - The mention string starting with '@'.
   * @param {User[]} users - A list of users to search through.
   * @param {(user: User) => void} emitUserFn - Function to emit the matched user.
   */
  private handleUserMention(mention: string, users: User[], emitUserFn: (user: User) => void): void {
    const username = mention.slice(1).toLowerCase();
    const user = users.find(u => (u.displayName || u.name).toLowerCase() === username);

    if (user) emitUserFn(user);
  }

  /**
   * Handles a channel mention by matching the channel name and emitting the corresponding channel.
   *
   * @param {string} mention - The mention string starting with '#'.
   * @param {Channel[]} channels - A list of channels to search through.
   * @param {(channel: Channel) => void} emitChannelFn - Function to emit the matched channel.
   */
  private handleChannelMention(mention: string, channels: Channel[], emitChannelFn: (channel: Channel) => void): void {
    const channelName = mention.slice(1).toLowerCase();
    const channel = channels.find(c => c.channelName.replace(/^#/, '').toLowerCase() === channelName);

    if (channel) emitChannelFn(channel);
  }
}