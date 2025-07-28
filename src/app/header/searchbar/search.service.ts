import { Injectable, inject } from '@angular/core';
import { collection, collectionGroup, Firestore, getDocs } from '@angular/fire/firestore';
import { Channel } from '../../../models/channel.class';
import { UserSharedService } from '../../userManagement/userManagement-service';
import { MessageSharedService } from '../../main-content/message-service';
import { ChatMessage } from '../../main-content/message.model';
import { ChannelSharedService } from '../../channel-management/channel-shared.service';

/**
 * Service for searching messages in channels and direct messages.
 * Applies access control and optional filtering by user and channel.
 */
@Injectable({ providedIn: 'root' })
export class SearchService {
  private firestore = inject(Firestore);
  public userService = inject(UserSharedService);
  public messageService = inject(MessageSharedService);
  public channelService = inject(ChannelSharedService);

  /**
   * Performs a search for messages matching a query string,
   * optionally filtered by user or channel.
   * 
   * @param query - The search term.
   * @param userFilter - List of user IDs to restrict the search to.
   * @param channelFilter - List of channel IDs to restrict the search to.
   * @returns A promise resolving to a list of matching search results.
   */
  async search(query: string, userFilter: string[] = [], channelFilter: string[] = []): Promise<SearchResult[]> {
    const actualUserId = this.userService.actualUserID;
    const allowedChannelIds = this.getAllowedChannelIds();

    const [channelResults, directResults] = await Promise.all([
      this.searchChannelMessages(query, userFilter, channelFilter, actualUserId, allowedChannelIds),
      this.searchDirectMessages(query, userFilter, actualUserId)
    ]);

    return [...channelResults, ...directResults];
  }

  /**
   * Searches messages in public or group channels.
   *
   * @param query - The search term.
   * @param userFilter - Optional user ID filter.
   * @param channelFilter - Optional channel ID filter.
   * @param userId - ID of the current user.
   * @param allowedChannels - List of channels the user has access to.
   * @returns A promise resolving to matching search results.
   */
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

  /**
   * Checks if a direct message should be included based on filters.
   *
   * @param otherUserId - ID of the other user in the conversation.
   * @param userFilter - List of user IDs to filter by.
   * @returns True if the message matches the filter, false otherwise.
   */
  private matchesDirectMessageFilters(otherUserId: string, userFilter: string[]): boolean {
    return userFilter.length === 0 || userFilter.includes(otherUserId);
  }

  /**
   * Retrieves the list of channel IDs the current user is allowed to search in.
   *
   * @returns Array of allowed channel IDs.
   */
  private getAllowedChannelIds(): string[] {
    return this.channelService.allValidChannels$.getValue().map((c: Channel) => c.channelId);
  }

  /**
 * Determines whether a message should be included in the results.
 *
 * @param data - The message data.
 * @param query - The search term.
 * @param userFilter - Optional user ID filter.
 * @param channelFilter - Optional channel ID filter.
 * @param userId - ID of the current user.
 * @param allowedChannels - List of allowed channel IDs.
 * @returns True if the message passes all filters, false otherwise.
 */
  private shouldIncludeMessage(data: ChatMessage, query: string, userFilter: string[],
    channelFilter: string[], userId: string, allowedChannels: string[]): boolean {
    return (
      this.matchesQuery(data, query) &&
      this.hasAccess(data, userId, allowedChannels) &&
      this.matchesFilters(data, userFilter, channelFilter)
    );
  }

  /**
   * Checks if the message text matches the search query.
   *
   * @param data - The message.
   * @param query - The search term.
   * @returns True if it matches, false otherwise.
   */
  private matchesQuery(data: ChatMessage, query: string): boolean {
    return data.text?.toLowerCase().includes(query.toLowerCase()) ?? false;
  }

  /**
   * Checks if the user has access to the message based on its channel or DM.
   *
   * @param data - The message.
   * @param userId - ID of the current user.
   * @param allowedChannels - List of allowed channels.
   * @returns True if accessible, false otherwise.
   */
  private hasAccess(data: ChatMessage, userId: string, allowedChannels: string[]): boolean {
    if (data.channelId) return allowedChannels.includes(data.channelId);
    if (data.user) return data.user.split('_').includes(userId);
    return false;
  }

  /**
   * Checks if the message matches the optional filters for user and channel.
   *
   * @param data - The message.
   * @param userFilter - List of user IDs to filter by.
   * @param channelFilter - List of channel IDs to filter by.
   * @returns True if it matches all filters, false otherwise.
   */
  private matchesFilters(data: ChatMessage, userFilter: string[], channelFilter: string[]): boolean {
    const matchesUser = userFilter.length === 0 || userFilter.includes(data.user);
    const matchesChannel = channelFilter.length === 0 || (!!data.channelId && channelFilter.includes(data.channelId));
    return matchesUser && matchesChannel;
  }
}

/**
 * Interface representing the result of a message search.
 */
export interface SearchResult {
  message: ChatMessage;
  path: string;
}