import { Injectable } from '@angular/core';
import { User } from '../userManagement/user.interface';
import { Channel } from '../../models/channel.class';
import { collection, Firestore, getDocs, query, where } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class MentionUtilsService {
  /**
   * Removes all `.mention` elements from the given HTML element and
   * returns the cleaned plain text content.
   *
   * @param {HTMLElement} element - The element from which to remove mentions.
   * @returns {string} - The cleaned text content.
   */
  static removeMentionsFromElement(element: HTMLElement): string {
    const mentionElements = element.querySelectorAll('.mention');

    mentionElements.forEach(el => el.remove());
    return element.innerText.trim();
  }

  /**
   * Extracts user and channel mentions from the editor's DOM and returns
   * a list of mentioned usernames, channel names, and the remaining text query.
   *
   * @param {HTMLElement} editor - The editor element containing mentions.
   * @returns {{ users: string[], channels: string[], query: string }} - Extracted mentions and query text.
   */
  static extractMentionsFromEditor(editor: HTMLElement): {
    users: string[];
    channels: string[];
    query: string;
  } {
    const mentions = editor.querySelectorAll('.mention');
    const mentionedUsers = this.extractMentionNames(mentions, '@');
    const mentionedChannels = this.extractMentionNames(mentions, '#');
    const clone = editor.cloneNode(true) as HTMLElement;

    clone.querySelectorAll('.mention').forEach(m => m.remove());

    const query = clone.innerText.trim();

    return { users: mentionedUsers, channels: mentionedChannels, query };
  }

  /**
   * Extracts mention names (usernames or channel names) from a list of mention elements.
   *
   * @param {NodeListOf<Element>} mentions - List of mention elements.
   * @param {'@' | '#'} prefix - The prefix to filter mentions ('@' for users, '#' for channels).
   * @returns {string[]} - Array of mention names without prefix, all lowercase and unique.
   */
  private static extractMentionNames(mentions: NodeListOf<Element>, prefix: '@' | '#'): string[] {
    const results: string[] = [];

    mentions.forEach(mention => {
      const text = mention.textContent?.trim() ?? '';

      if (text.startsWith(prefix)) {
        const name = text.slice(1).toLowerCase();

        if (!results.includes(name)) results.push(name);
      }
    });

    return results;
  }

  /**
   * Extracts full User and Channel objects from mention elements in the given element,
   * matching them against provided user and channel lists.
   *
   * @param {HTMLElement} element - The element containing mention elements.
   * @param {User[]} users - List of known users to match against.
   * @param {Channel[]} channels - List of known channels to match against.
   * @returns {{ users: User[], channels: Channel[] }} - Found users and channels.
   */
  static extractMentionsFromElement(element: HTMLElement, users: User[], channels: Channel[]
  ): { users: User[], channels: Channel[] } {
    const mentions = element.querySelectorAll('.mention');

    return {
      users: this.extractUsers(mentions, users),
      channels: this.extractChannels(mentions, channels)
    };
  }

  /**
   * Finds user objects mentioned by '@username' in the given mention elements.
   *
   * @param {NodeListOf<Element>} mentions - List of mention elements.
   * @param {User[]} users - List of known users.
   * @returns {User[]} - Array of matched User objects without duplicates.
   */
  private static extractUsers(mentions: NodeListOf<Element>, users: User[]): User[] {
    const foundUsers: User[] = [];

    mentions.forEach(mention => {
      const text = mention.textContent ?? '';

      if (text.startsWith('@')) {
        const name = text.slice(1).toLowerCase();
        const user = users.find(u => (u.displayName || u.name).toLowerCase() === name);

        if (user && !foundUsers.some(u => u.id === user.id)) foundUsers.push(user);
      }
    });

    return foundUsers;
  }

  /**
   * Finds channel objects mentioned by '#channelname' in the given mention elements.
   *
   * @param {NodeListOf<Element>} mentions - List of mention elements.
   * @param {Channel[]} channels - List of known channels.
   * @returns {Channel[]} - Array of matched Channel objects without duplicates.
   */
  private static extractChannels(mentions: NodeListOf<Element>, channels: Channel[]): Channel[] {
    const foundChannels: Channel[] = [];

    mentions.forEach(mention => {
      const text = mention.textContent ?? '';

      if (text.startsWith('#')) {
        const name = text.slice(1).toLowerCase();
        const channel = channels.find(c => c.channelName.replace(/^#/, '').toLowerCase() === name);

        if (channel && !foundChannels.some(c => c.channelId === channel.channelId)) foundChannels.push(channel);
      }
    });

    return foundChannels;
  }

  /**
   * Retrieves the text content from the beginning of the editor to the current cursor position.
   *
   * @param {HTMLElement} editor - The contenteditable editor element.
   * @param {Selection | null} selection - The current text selection.
   * @returns {string} - The text before the cursor.
   */
  static getTextBeforeCursor(editor: HTMLElement, selection: Selection | null): string {
    if (!selection || selection.rangeCount === 0) return '';

    const range = selection.getRangeAt(0).cloneRange();

    range.collapse(true);
    range.setStart(editor, 0);
    return range.toString();
  }

  /**
   * Synchronizes the current text content of the editor with the provided form control.
   * Mentions (e.g. `@username`, `#channel`) are stripped from the content.
   *
   * @param {HTMLElement} editor - The editor element containing text.
   * @param {any} formControl - The FormControl instance to update.
   */
  static syncEditorToForm(editor: HTMLElement, formControl: any) {
    if (!editor || !formControl) return;

    let content = editor.innerText.trim();

    content = content.replace(/[@#][^@\s]+/g, '').replace(/\s{2,}/g, ' ').trim();
    formControl.setValue(content);
  }

  /**
   * Handles the Backspace key event inside a contenteditable editor.
   * If the cursor is positioned next to a mention element, the mention is removed.
   *
   * @param {KeyboardEvent} event - The keydown event.
   * @param {HTMLElement} editor - The editor element.
   * @param {any} formControl - The associated FormControl to sync with.
   */
  static handleEditorKeyDown(event: KeyboardEvent, editor: HTMLElement, formControl: any) {
    if (event.key !== 'Backspace') return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const { startContainer, startOffset } = range;

    if (this.isAtMentionStart(startContainer, startOffset) || this.isBeforeMention(startContainer, startOffset) ||
      this.isDirectMention(startContainer)) {
      event.preventDefault();
      this.syncEditorToForm(editor, formControl);
    }
  }

  /**
   * Determines whether the cursor is placed immediately after a mention element.
   * If so, the mention element is removed.
   *
   * @param {Node} container - The current range start container.
   * @param {number} offset - The offset within the container.
   * @returns {boolean} - `true` if a mention was removed, otherwise `false`.
   */
  private static isAtMentionStart(container: Node, offset: number): boolean {
    const prev = container.nodeType === Node.TEXT_NODE ? container.previousSibling : null;
    if (prev instanceof HTMLElement && prev.classList.contains('mention') && offset === 0) {
      prev.remove();
      return true;
    }
    return false;
  }

  /**
   * Checks whether a mention element exists immediately before the current offset,
   * and removes it if found.
   *
   * @param {Node} container - The current range start container.
   * @param {number} offset - The offset within the container.
   * @returns {boolean} - `true` if a mention was removed, otherwise `false`.
   */
  private static isBeforeMention(container: Node, offset: number): boolean {
    if (container.nodeType === Node.ELEMENT_NODE) {
      const el = container as HTMLElement;
      const prevNode = el.childNodes[offset - 1];

      if (prevNode instanceof HTMLElement && prevNode.classList.contains('mention')) {
        prevNode.remove();
        return true;
      }
    }
    return false;
  }

  /**
   * Determines whether the current selection container is a mention element, and removes it if so.
   *
   * @param {Node} container - The current range start container.
   * @returns {boolean} - `true` if a mention was removed, otherwise `false`.
   */
  private static isDirectMention(container: Node): boolean {
    if (container.nodeType === Node.ELEMENT_NODE && (container as HTMLElement).classList.contains('mention')) {
      (container as HTMLElement).remove();
      return true;
    }

    return false;
  }

  /**
   * Searches a given text for valid email addresses and tries to match them with users in Firestore.
   * Returns a list of display names (formatted as mentions) for all matched users.
   * Throws an error if a mentioned email does not match any user.
   *
   * @param text - The input text containing one or more email addresses.
   * @param firestore - The Firestore instance to query the users collection.
   * @returns A Promise that resolves to an array of mention strings (e.g. ['@alice']).
   * @throws If any email address does not match a user in Firestore an error is thrown.
   */
  static async findEmails(text: string, firestore: Firestore): Promise<string[]> {
    const matches = [...text.matchAll(/[\w.-]+@[\w.-]+\.\w{2,}/g)];
    const results: string[] = [];
    const hasUnmatchedEmail = this.looksLikeEmail(text) && matches.length === 0;

    if (hasUnmatchedEmail) throw new Error('Keine gültige E-Mail-Adresse erkannt.');

    for (const match of matches) {
      const email = match[0].toLowerCase();
      const user = await this.getUserByEmail(email, firestore);

      if (user) results.push(`@${user.displayName || user.name}`);
      else throw new Error(`Kein Benutzer mit E-Mail-Adresse "${email}" gefunden.`);
    }

    return results;
  }

  /**
   * Determines whether a given string has a basic email-like format.
   *
   * This check only verifies that the string contains exactly one `@` symbol
   * with non-whitespace characters on both sides. It does not validate full
   * email syntax.
   *
   * @param text - The string to validate as an email-like pattern.
   * @returns `true` if the string appears to be in email format, otherwise `false`.
   */
  private static looksLikeEmail(text: string): boolean {
    return /^[^\s@]+@[^\s@]+$/.test(text);
  }

  /**
   * Queries Firestore to find a user document by the given email address.
   *
   * @param email - The email address to look for.
   * @param firestore - The Firestore instance to use for querying.
   * @returns A Promise resolving to the matched User object, or null if not found.
   */
  private static async getUserByEmail(email: string, firestore: Firestore): Promise<User | null> {
    const usersRef = collection(firestore, 'users');
    const q = query(usersRef, where('email', '==', email));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;
    return snapshot.docs[0].data() as User;
  }

  /**
   * Extracts valid user mentions from the given text and matches them against the provided list of users.
   *
   * Each mention must follow the format `@username`.
   *
   * @param {string} text - The input text potentially containing user mentions.
   * @param {User[]} users - The list of users to match mentions against.
   * @returns {string[]} An array of matched user mentions in the format `@displayName` or `@name`.
   */
  static findUserMentions(text: string, users: User[]): string[] {
    const matches = [...text.matchAll(/@(\w{1,16})/g)];
    const mentions: string[] = [];

    for (const [, username] of matches) {
      const name = username.toLowerCase();
      const user = users.find(u => u.name?.toLowerCase() === name || u.displayName?.toLowerCase() === name);

      if (user) mentions.push(`@${user.displayName || user.name}`);
    }

    return mentions;
  }

  /**
   * Extracts valid channel mentions from the given text and matches them against the provided list of channels.
   *
   * Each mention must follow the format `#channelname`.
   *
   * @param {string} text - The input text potentially containing channel mentions.
   * @param {Channel[]} channels - The list of channels to match mentions against.
   * @returns {string[]} An array of matched channel mentions in the format `#channelName`.
   */
  static findChannelMentions(text: string, channels: Channel[]): string[] {
    const matches = [...text.matchAll(/#(\w{1,16})/g)];
    const mentions: string[] = [];

    for (const [, name] of matches) {
      const lowerName = name.toLowerCase();
      const channel = channels.find(c => c.channelName?.replace(/^#/, '').toLowerCase() === lowerName);

      if (channel) mentions.push(`${channel.channelName}`);
    }

    return mentions;
  }
}