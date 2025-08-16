import { Injectable, SimpleChanges } from '@angular/core';
import { WriteMessageComponent } from './write-message.component';
import { MentionUtilsService } from '../../search/mention-utils.service';
import { User } from '../../userManagement/user.interface';
import { Channel } from '../../../models/channel.class';
import { doc, collection, query, where, getDocs, onSnapshot, addDoc, serverTimestamp } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class WriteMessageService {
  /**
   * Processes input changes for selected user and channel, 
   * triggers checks and updates placeholder and editor focus.
   * 
   * @param context - The WriteMessageComponent instance.
   * @param changes - The changed input properties.
   */
  handleChanges(context: WriteMessageComponent, changes: SimpleChanges): void {
    if (changes['selectedUser'] && context.selectedUser) {
      this.checkChatExists(context);
      this.focusEditorSafely(context);
    }

    if (changes['selectedChannel'] && context.selectedChannel) {
      this.checkChannelMessagesExist(context);
      this.focusEditorSafely(context);
    }

    this.putPlaceHolderText(context);
  }

  /**
   * Focuses the editor and restores cursor position with a short delay.
   * 
   * @param context - The WriteMessageComponent instance.
   */
  private focusEditorSafely(context: WriteMessageComponent): void {
    setTimeout(() => {
      if (context.editor?.nativeElement) {
        context.editor.nativeElement.focus();
        context.mentionComponent?.restoreCursorPosition();
      }
    }, 10);
  }

  /**
  * Checks whether a direct chat already exists between the current user and the selected user.
  * 
  * @param context - The WriteMessageComponent instance.
  */
  private checkChatExists(context: WriteMessageComponent): void {
    const sortedIds = [context.shared.actualUser.uid, context.selectedUser?.id].sort();
    const chatId = sortedIds.join('_');
    const directMessages = collection(context.firestore, "directMessages");
    const q = query(directMessages, where('chatId', '==', chatId));

    onSnapshot(q, (querySnapshot) => {
      context.chatExists = !querySnapshot.empty;
    });
  }

  /**
   * Checks asynchronously if messages exist in the currently selected channel.
   *
   * @param {WriteMessageComponent} context - The component instance containing the channel state.
   * @returns {Promise<void>} A promise that resolves when the check is complete.
   */
  private async checkChannelMessagesExist(context: WriteMessageComponent): Promise<void> {
    const selectedId = context.selectedChannel?.channelId ?? '';
    const chatDocRef = doc(context.firestore, 'channels', selectedId);
    const messagesRef = collection(chatDocRef, 'messages');
    const snapshot = await getDocs(messagesRef);

    context.channelMessagesExist = !snapshot.empty;
  }

  /**
   * Sets the placeholder text for the message input field based on the current mode and selected user or channel.
   * 
   * @param context - The WriteMessageComponent instance.
   */
  putPlaceHolderText(context: WriteMessageComponent) {
    if (context.mode === 'thread') context.placeHolderText = 'Antworten...';
    else {
      if (context.sharedMessages.selectedUser?.id == context.shared.actualUserID) context.placeHolderText = 'Nachricht an dich selbst';
      else {
        context.placeHolderText = context.selectedChannel ? 'Nachricht an ' + context.selectedChannel.channelName
          : 'Nachricht an ' + context.selectedUser?.name;
      }
    }
  }

  /**
   * Handles message submission: validates, extracts mentions, sends messages, and resets state.
   * 
   * @param context - The WriteMessageComponent instance.
   */
  async onSubmit(context: WriteMessageComponent): Promise<void> {
    if (await this.shouldAbortSubmission(context)) return;

    const message = this.removeMentionsFromDOM(context);

    if (!message) return;

    const { mentionedUsers, mentionedChannels } = this.getMentionedEntities(context);

    this.handleUserSelection(context, mentionedUsers);
    this.handleChannelSelection(context, mentionedChannels);
    await this.sendMessages(context, message, mentionedUsers, mentionedChannels);
    this.clearAfterSend(context);
    this.resetMentionArrays(context);
  }

  /**
   * Checks whether the submission should be aborted based on devspace content.
   * 
   * @param context - The WriteMessageComponent instance.
   * @returns A promise resolving to `true` if submission should be aborted.
   */
  private async shouldAbortSubmission(context: WriteMessageComponent): Promise<boolean> {
    if (!context.devspaceOpen) return false;

    const valid = await this.handleDevspaceEntry(context);
    if (valid) return false;

    context.editor.nativeElement.innerHTML = '';
    context.devspaceService.clearEditor();
    return true;
  }

  /**
   * Processes the current content of the devspace editor by extracting mentions such as emails,
   * user mentions, and channel mentions. Clears the editor afterwards.
   * 
   * @param context - The WriteMessageComponent instance.
   * @returns A promise resolving to `true` if any mentions were found, otherwise `false`.
   */
  async handleDevspaceEntry(context: WriteMessageComponent): Promise<boolean> {
    const input = context.devspaceService.getEditorTextContent();
    if (!input) return false;
    const mentions: string[] = [];

    try {
      mentions.push(...await MentionUtilsService.findEmails(input, context.firestore));
    } catch (error: any) {
      context.searchMail.emit({ success: false, message: 'Es gibt keinen registrierten User mit dieser E-Mail-Adresse.' });
      return false;
    }
    mentions.push(...MentionUtilsService.findUserMentions(input, context.users));
    mentions.push(...MentionUtilsService.findChannelMentions(input, context.channels));
    context.devspaceMentions = mentions;
    context.devspaceService.clearEditor();
    return mentions.length > 0;
  }

  /**
   * Removes mention elements (e.g., @username tags) from the editor's DOM content.
   *
   * @param context - The WriteMessageComponent instance.
   * @returns {string} The plain text content of the editor after mentions have been removed.
   */
  private removeMentionsFromDOM(context: WriteMessageComponent): string {
    return MentionUtilsService.removeMentionsFromElement(context.editor.nativeElement);
  }

  /**
   * Selects the first mentioned user and emits a selection event.
   * 
   * @param context - The WriteMessageComponent instance.
   * @param users - Array of mentioned users.
   */
  private handleUserSelection(context: WriteMessageComponent, users: User[]): void {
    if (users.length > 0) {
      context.selectedUser = users[0];
      context.selectedChannel = null;
      context.selectUser.emit(context.selectedUser);
    }
  }

  /**
   * Selects the first mentioned channel and emits a selection event.
   * 
   * @param context - The WriteMessageComponent instance.
   * @param channels - Array of mentioned channels.
   */
  private handleChannelSelection(context: WriteMessageComponent, channels: Channel[]): void {
    if (channels.length > 0) {
      context.selectedChannel = channels[0];
      context.selectedUser = null;
      context.selectChannel.emit(context.selectedChannel);
    }
  }

  /**
   * Resets mentioned users and channels arrays.
   * 
   * @param context - The WriteMessageComponent instance.
   */
  private resetMentionArrays(context: WriteMessageComponent): void {
    context.mentionedUsers = [];
    context.mentionedChannels = [];
  }

  /**
   * Collects all mentioned users and channels from explicit mentions and devspace text.
   * 
   * @param context - The WriteMessageComponent instance.
   * @returns An object containing arrays of mentioned users and channels.
   */
  private getMentionedEntities(context: WriteMessageComponent) {
    const users = this.collectMentionedUsernames(context);
    const channels = this.collectMentionedChannelNames(context);
    const mentionedUsers = context.users.filter(u => users.includes((u.displayName || u.name).toLowerCase()));
    const mentionedChannels = context.channels.filter(c => channels.includes(c.channelName.toLowerCase()));

    return { mentionedUsers, mentionedChannels };
  }

  /**
   * Collects mentioned usernames from explicit and devspace mentions.
   * 
   * @param context - The WriteMessageComponent instance.
   * @returns Array of mentioned usernames in lowercase.
   */
  private collectMentionedUsernames(context: WriteMessageComponent): string[] {
    const explicit = context.mentionedUsers.map(u => (u.displayName || u.name).toLowerCase());
    const fromText = context.devspaceMentions
      .filter(m => m.startsWith('@'))
      .map(m => m.substring(1).toLowerCase());

    return [...explicit, ...fromText];
  }

  /**
   * Collects mentioned channel names from explicit and devspace mentions.
   * 
   * @param context - The WriteMessageComponent instance.
   * @returns Array of mentioned channel names in lowercase.
   */
  private collectMentionedChannelNames(context: WriteMessageComponent): string[] {
    const explicit = context.mentionedChannels.map(c => c.channelName.toLowerCase());
    const fromText = context.devspaceMentions
      .filter(m => m.startsWith('#'))
      .map(m => m.substring(1).toLowerCase());

    return [...explicit, ...fromText];
  }

  /**
   * Sends a message either as a default message or to specific users and channels.
   * This method checks whether there are any users or channels mentioned.
   *
   * @param context - The WriteMessageComponent instance.
   * @param message - The message content to be sent.
   * @param users - An array of `User` objects representing the recipients for direct messages.
   * @param channels - An array of `Channel` objects representing the target channels.
   * @returns A `Promise` that resolves once all messages have been sent.
   */
  private async sendMessages(context: WriteMessageComponent, message: string, users: User[], channels: Channel[]) {
    if (users.length === 0 && channels.length === 0) await this.sendDefaultMessage(context, message);
    else {
      for (const user of users) {
        await context.pushDirectChatMessages(message, user);
      }
      for (const channel of channels) {
        await context.pushChannelMessages(message, channel);
      }
    }
  }

  /**
   * Sends a default message based on the current messaging context.
   * This function checks the current mode and context (thread, selected user, or selected channel)
   * and routes the message.
   *
   * @param context - The WriteMessageComponent instance.
   * @param message - The message content to be sent.
   * @returns A `Promise` that resolves after the appropriate message has been dispatched.
   */
  private async sendDefaultMessage(context: WriteMessageComponent, message: string): Promise<void> {
    if (context.mode === 'thread') await this.pushAnswerMessageChannel(context);
    else if (context.selectedUser) await context.pushDirectChatMessages(message, context.selectedUser);
    else if (context.selectedChannel) await context.pushChannelMessages(message, context.selectedChannel);
  }

  /**
   * Clears the message editor and resets the mention list after a message is sent.
   * 
   * @param context - The WriteMessageComponent instance.
   */
  private clearAfterSend(context: WriteMessageComponent) {
    context.editor.nativeElement.innerHTML = '';
    context.devspaceMentions = [];
  }

  /**
   * Sends a reply message to the currently selected thread, whether it's in a channel or a direct chat.
   * 
   * @param context - The WriteMessageComponent instance.
   */
  async pushAnswerMessageChannel(context: WriteMessageComponent): Promise<void> {
    const messageText = context.messageForm.value.message ?? '';
    const messageId = context.sharedMessages.selectedMessage?.id ?? '';
    const channelId = context.sharedMessages.selectedMessage?.channelId ?? '';

    if (!messageText || !messageId || !channelId) return;
    if (context.sharedMessages.channelSelected) await this.sendAnswerToChannel(context, channelId, messageId, messageText);
    else if (context.sharedMessages.userSelected) await this.sendAnswerToDirectChat(context, channelId, messageId, messageText);

    context.messageForm.reset();
  }

  /**
   * Adds a reply to a channel message thread in Firestore.
   * 
   * @param context - The WriteMessageComponent instance.
   * @param channelId - ID of the channel where the message exists.
   * @param messageId - ID of the message being replied to.
   * @param text - The reply message content.
   */
  private async sendAnswerToChannel(context: WriteMessageComponent, channelId: string, messageId: string, text: string): Promise<void> {
    const answerRef = collection(context.firestore, 'channels', channelId, 'messages', messageId, 'answers');

    await addDoc(answerRef, { user: context.shared.actualUser.uid, text, timeStamp: serverTimestamp() });
  }

  /**
   * Adds a reply to a direct message thread in Firestore.
   * 
   * @param context - The WriteMessageComponent instance.
   * @param chatId - ID of the direct message chat.
   * @param messageId - ID of the message being replied to.
   * @param text - The reply message content.
   */
  private async sendAnswerToDirectChat(context: WriteMessageComponent, chatId: string, messageId: string, text: string): Promise<void> {
    const answerRef = collection(context.firestore, 'directMessages', chatId, 'messages', messageId, 'answers');

    await addDoc(answerRef, { user: context.shared.actualUser.uid, text, timeStamp: serverTimestamp() });
  }
}