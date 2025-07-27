import { Injectable, inject } from '@angular/core';
import { collection, collectionGroup, Firestore, getDocs } from '@angular/fire/firestore';
import { Channel } from '../../../models/channel.class';
import { UserSharedService } from '../../userManagement/userManagement-service';
import { MessageSharedService } from '../../main-content/message-service';
import { ChatMessage } from '../../main-content/message.model';
import { ChannelSharedService } from '../../channel-management/channel-shared.service';

@Injectable({ providedIn: 'root' })
export class SearchService {
  private firestore = inject(Firestore);
  public userService = inject(UserSharedService);
  public messageService = inject(MessageSharedService);
  public channelService = inject(ChannelSharedService);

  async search(query: string, userFilter: string[] = [], channelFilter: string[] = []): Promise<SearchResult[]> {
    const actualUserId = this.userService.actualUserID;
    const allowedChannelIds = this.getAllowedChannelIds();

    const [channelResults, directResults] = await Promise.all([
      this.searchChannelMessages(query, userFilter, channelFilter, actualUserId, allowedChannelIds),
      this.searchDirectMessages(query, userFilter, actualUserId)
    ]);

    return [...channelResults, ...directResults];
  }

  private async searchChannelMessages(query: string, userFilter: string[], channelFilter: string[],
    userId: string, allowedChannels: string[]): Promise<SearchResult[]> {
    const snapshot = await getDocs(collectionGroup(this.firestore, 'messages'));
    const results: SearchResult[] = [];

    snapshot.forEach(docSnap => {
      const data = docSnap.data() as ChatMessage;
      const path = docSnap.ref.path;

      if (!this.shouldIncludeMessage(data, query, userFilter, channelFilter, userId, allowedChannels)) return;
      results.push({ message: { ...data, id: docSnap.id }, path });
    });

    return results;
  }

  private async searchDirectMessages(query: string, userFilter: string[], actualUserId: string): Promise<SearchResult[]> {
    const collectionRef = collection(this.firestore, 'directMessages');
    const chatDocs = await getDocs(collectionRef);
    const results: SearchResult[] = [];

    for (const docSnap of chatDocs.docs) {
      const chatId = docSnap.id;
      if (!chatId.includes(actualUserId)) continue;

      const otherUser = chatId.split('_').find(id => id !== actualUserId);
      if (!otherUser) continue;

      const messagesCol = collection(this.firestore, `directMessages/${chatId}/messages`);
      const messagesSnap = await getDocs(messagesCol);

      messagesSnap.forEach(messageDoc => {
        const data = messageDoc.data() as ChatMessage;
        if (!this.matchesQuery(data, query)) return;
        if (!this.matchesDirectMessageFilters(otherUser, userFilter)) return;

        const enrichedMessage: ChatMessage = { ...data, id: messageDoc.id, user: otherUser };
        results.push({ message: enrichedMessage, path: messageDoc.ref.path });
      });
    }

    return results;
  }

  private matchesDirectMessageFilters(otherUserId: string, userFilter: string[]): boolean {
    return userFilter.length === 0 || userFilter.includes(otherUserId);
  }

  private getAllowedChannelIds(): string[] {
    return this.channelService.allValidChannels$.getValue().map((c: Channel) => c.channelId);
  }

  private shouldIncludeMessage(data: ChatMessage, query: string, userFilter: string[],
    channelFilter: string[], userId: string, allowedChannels: string[]): boolean {
    return (
      this.matchesQuery(data, query) &&
      this.hasAccess(data, userId, allowedChannels) &&
      this.matchesFilters(data, userFilter, channelFilter)
    );
  }

  private matchesQuery(data: ChatMessage, query: string): boolean {
    return data.text?.toLowerCase().includes(query.toLowerCase()) ?? false;
  }

  private hasAccess(data: ChatMessage, userId: string, allowedChannels: string[]): boolean {
    if (data.channelId) return allowedChannels.includes(data.channelId);
    if (data.user) return data.user.split('_').includes(userId);
    return false;
  }

  private matchesFilters(data: ChatMessage, userFilter: string[], channelFilter: string[]): boolean {
    const matchesUser = userFilter.length === 0 || userFilter.includes(data.user);
    const matchesChannel = channelFilter.length === 0 || (!!data.channelId && channelFilter.includes(data.channelId));
    return matchesUser && matchesChannel;
  }
}

export interface SearchResult {
  message: ChatMessage;
  path: string;
}