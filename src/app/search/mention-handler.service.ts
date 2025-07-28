import { Injectable } from '@angular/core';
import { User } from '../userManagement/user.interface';
import { Channel } from '../../models/channel.class';

@Injectable({
  providedIn: 'root'
})
export class MentionHandlerService {
   /**
   * Handles a selected mention (e.g., @user or #channel) by:
   * - Inserting the mention into the editor
   * - Emitting the matched user or channel if found
   * - Triggering optional form synchronization
   *
   * @param mention - The selected mention string (e.g., "@alice", "#devs")
   * @param users - Array of all valid users
   * @param channels - Array of all valid channels
   * @param insertMentionFn - Callback to insert the mention into the editor
   * @param emitUserFn - Callback to emit the corresponding user (if found)
   * @param emitChannelFn - Callback to emit the corresponding channel (if found)
   * @param syncFn - Optional callback to sync the editor content to the form
   */
  handleMentionSelected(mention: string, users: User[], channels: Channel[],
    insertMentionFn: (mention: string) => void,
    emitUserFn: (user: User) => void,
    emitChannelFn: (channel: Channel) => void,
    syncFn?: () => void): void {
    insertMentionFn(mention);
    syncFn?.();

    if (mention.startsWith('@')) {
      const username = mention.slice(1).toLowerCase();
      const user = users.find(u =>
        (u.displayName || u.name).toLowerCase() === username
      );
      if (user) emitUserFn(user);
    }

    if (mention.startsWith('#')) {
      const channelName = mention.slice(1).toLowerCase();
      const channel = channels.find(c =>
        c.channelName.replace(/^#/, '').toLowerCase() === channelName
      );
      if (channel) emitChannelFn(channel);
    }
  }
}