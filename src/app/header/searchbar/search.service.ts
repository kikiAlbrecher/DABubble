import { Injectable, inject } from '@angular/core';
import { collection, collectionGroup, DocumentData, Firestore, getDocs, QuerySnapshot } from '@angular/fire/firestore';
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

  /**
 * Searches direct messages for a specific user, filtered by query and user filters.
 *
 * @param {string} query - The text query to search for within messages.
 * @param {string[]} userFilter - A list of user IDs to filter results by.
 * @param {string} actualUserId - The ID of the currently authenticated user.
 * @returns {Promise<SearchResult[]>} A promise resolving to a list of matched search results.
 */
  private async searchDirectMessages(query: string, userFilter: string[], actualUserId: string): Promise<SearchResult[]> {
    const chatDocs = await this.fetchDirectMessageChats();
    const results: SearchResult[] = [];

    for (const docSnap of chatDocs.docs) {
      const chatId = docSnap.id;
      if (!this.isUserInChat(chatId, actualUserId)) continue;

      const otherUser = this.getOtherUserFromChatId(chatId, actualUserId);
      if (!otherUser) continue;

      const messages = await this.fetchMessages(chatId);
      const matched = this.filterMessages(messages, query, otherUser, userFilter);
      results.push(...matched);
    }

    return results;
  }

  /**
   * Fetches all direct message chat documents from Firestore.
   *
   * @returns {Promise<QuerySnapshot<DocumentData>>} A promise resolving to the collection of chat documents.
   */
  private async fetchDirectMessageChats() {
    const collectionRef = collection(this.firestore, 'directMessages');

    return await getDocs(collectionRef);
  }

  /**
   * Checks if the current user is part of a given chat ID.
   *
   * @param {string} chatId - The ID of the chat.
   * @param {string} actualUserId - The ID of the currently authenticated user.
   * @returns {boolean} True if the user is part of the chat; otherwise, false.
   */
  private isUserInChat(chatId: string, actualUserId: string): boolean {
    return chatId.includes(actualUserId);
  }

  /**
   * Extracts the other user's ID from a direct message (chatId).
   *
   * @param {string} chatId - The ID of the chat (formatted like "userA_userB").
   * @param {string} actualUserId - The ID of the currently authenticated user.
   * @returns {string | undefined} The ID of the other user, or undefined if not found.
   */
  private getOtherUserFromChatId(chatId: string, actualUserId: string): string | undefined {
    return chatId.split('_').find(id => id !== actualUserId);
  }

  /**
   * Fetches all messages from a given direct message chat.
   *
   * @param {string} chatId - The ID of the chat to fetch messages from.
   * @returns {Promise<QuerySnapshot<DocumentData>>} A promise resolving to the message documents.
   */
  private async fetchMessages(chatId: string) {
    const messagesCol = collection(this.firestore, `directMessages/${chatId}/messages`);

    return await getDocs(messagesCol);
  }

  /**
   * Filters messages based on a query and user filter criteria.
   *
   * @param {QuerySnapshot<DocumentData>} messagesSnap - Snapshot of message documents to filter.
   * @param {string} query - The text query to search for within messages.
   * @param {string} otherUser - The ID of the other user in the chat.
   * @param {string[]} userFilter - A list of user IDs to include in the results.
   * @returns {SearchResult[]} A list of matched messages with enriched data.
   */
  private filterMessages(messagesSnap: QuerySnapshot<DocumentData>, query: string, otherUser: string, userFilter: string[]): SearchResult[] {
    const results: SearchResult[] = [];

    messagesSnap.forEach(messageDoc => {
      const data = messageDoc.data() as ChatMessage;
      if (!this.matchesQuery(data, query)) return;
      if (!this.matchesDirectMessageFilters(otherUser, userFilter)) return;

      const enrichedMessage: ChatMessage = { ...data, id: messageDoc.id, user: otherUser };
      results.push({ message: enrichedMessage, path: messageDoc.ref.path });
    });

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