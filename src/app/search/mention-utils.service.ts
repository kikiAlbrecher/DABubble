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
   * Extracts all mentions (@users and #channels) from the given editor element
   * and also attempts to determine a search query (text outside mentions).
   *
   * @param {HTMLElement} editor - The editor element containing mentions.
   * @returns {{ users: string[], channels: string[], query: string }} - Extracted mentions and a possible query.
   */
  static extractMentionsFromEditor(editor: HTMLElement): {
    users: string[];
    channels: string[];
    query: string;
  } {
    const mentions = editor.querySelectorAll('.mention');
    const mentionedUsers: string[] = [];
    const mentionedChannels: string[] = [];

    mentions.forEach(mention => {
      const text = mention.textContent?.trim() ?? '';
      if (text.startsWith('@')) {
        const name = text.slice(1).toLowerCase();
        if (!mentionedUsers.includes(name)) {
          mentionedUsers.push(name);
        }
      } else if (text.startsWith('#')) {
        const name = text.slice(1).toLowerCase();
        if (!mentionedChannels.includes(name)) {
          mentionedChannels.push(name);
        }
      }
    });

    const clone = editor.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('.mention').forEach(m => m.remove());
    const query = clone.innerText.trim();

    return {
      users: mentionedUsers,
      channels: mentionedChannels,
      query
    };
  }

  static extractMentionsFromElement(
    element: HTMLElement,
    users: User[],
    channels: Channel[]
  ): { users: User[], channels: Channel[] } {
    const mentions = element.querySelectorAll('.mention');
    const mentionedUsers: User[] = [];
    const mentionedChannels: Channel[] = [];

    mentions.forEach((mention) => {
      const text = mention.textContent ?? '';

      if (text.startsWith('@')) {
        const name = text.slice(1).toLowerCase();
        const user = users.find(u =>
          (u.displayName || u.name).toLowerCase() === name
        );
        if (user && !mentionedUsers.some(u => u.id === user.id)) {
          mentionedUsers.push(user);
        }
      }

      if (text.startsWith('#')) {
        const name = text.slice(1).toLowerCase();
        const channel = channels.find(c =>
          c.channelName.replace(/^#/, '').toLowerCase() === name
        );
        if (channel && !mentionedChannels.some(c => c.channelId === channel.channelId)) {
          mentionedChannels.push(channel);
        }
      }
    });

    return { users: mentionedUsers, channels: mentionedChannels };
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

    if (this.isAtMentionStart(startContainer, startOffset) ||
      this.isBeforeMention(startContainer, startOffset) ||
      this.isDirectMention(startContainer)) {
      event.preventDefault();
      this.syncEditorToForm(editor, formControl);
    }
  }

  /**
   * Determines whether the cursor is placed immediately after a mention element.
   * If so, the mention element is removed.
   *
   * @private
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
   * @private
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
   * Determines whether the current selection container is a mention element,
   * and removes it if so.
   *
   * @private
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

  static async findEmails(text: string, firestore: Firestore): Promise<string[]> {
    const matches = [...text.matchAll(/[\w.-]+@[\w.-]+\.\w{2,}/g)];
    const results: string[] = [];

    for (const match of matches) {
      const email = match[0].toLowerCase();
      const user = await this.getUserByEmail(email, firestore);
      if (user) {
        results.push(`@${user.displayName || user.name}`);
      } else {
        throw new Error(`Kein Benutzer mit E-Mail-Adresse "${email}" gefunden.`);
      }
    }

    return results;
  }

  private static async getUserByEmail(email: string, firestore: Firestore): Promise<User | null> {
    const usersRef = collection(firestore, 'users');
    const q = query(usersRef, where('email', '==', email));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return snapshot.docs[0].data() as User;
  }

  /**
   * Find @user mentions based on text and known user list.
   */
  static findUserMentions(text: string, users: User[]): string[] {
    const matches = [...text.matchAll(/@(\w{1,30})/g)];
    const mentions: string[] = [];

    for (const [, username] of matches) {
      const name = username.toLowerCase();
      const user = users.find(u =>
        u.name?.toLowerCase() === name || u.displayName?.toLowerCase() === name
      );
      if (user) mentions.push(`@${user.displayName || user.name}`);
    }

    return mentions;
  }

  /**
   * Find #channel mentions based on text and known channel list.
   */
  static findChannelMentions(text: string, channels: Channel[]): string[] {
    const matches = [...text.matchAll(/#(\w{1,50})/g)];
    const mentions: string[] = [];

    for (const [, name] of matches) {
      const channel = channels.find(c =>
        c.channelName?.toLowerCase() === name.toLowerCase()
      );
      if (channel) mentions.push(`#${channel.channelName}`);
    }

    return mentions;
  }
}