import { Injectable } from '@angular/core';
import { User } from '../userManagement/user.interface';
import { Channel } from '../../models/channel.class';

@Injectable({
  providedIn: 'root'
})
export class MentionHandlerService {
  handleMentionSelected(
    mention: string,
    users: User[],
    channels: Channel[],
    insertMentionFn: (mention: string) => void,
    emitUserFn: (user: User) => void,
    emitChannelFn: (channel: Channel) => void,
    syncFn?: () => void
  ): void {
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