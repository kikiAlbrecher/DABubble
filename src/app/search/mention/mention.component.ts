import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { User } from '../../userManagement/user.interface';
import { Channel } from '../../../models/channel.class';
import { MentionService } from '../mention.service';
import { UsersComponent } from '../../style-components/users/users.component';
import { ChannelsComponent } from '../../style-components/channels/channels.component';

/**
 * Component responsible for rendering and handling mention suggestions for users and channels.
 * Supports `@user` and `#channel` triggers.
 */
@Component({
  selector: 'app-mention',
  standalone: true,
  imports: [CommonModule, UsersComponent, ChannelsComponent],
  templateUrl: './mention.component.html',
  styleUrl: './mention.component.scss',
  providers: [MentionService]
})
export class MentionComponent implements OnInit {
  @Input() targetInputElement: HTMLElement | null = null;
  @Input() users: User[] = [];
  @Input() channels: Channel[] = [];
  @Input() contextClass: string = '';
  @Output() mentionSelected = new EventEmitter<string>();

  filteredItems: Array<User | Channel> = [];
  trigger: '@' | '#' | null = null;
  query: string = '';

  public savedRange: Range | null = null;
  public mentionService = inject(MentionService);
  public showOverlay: boolean = false;
  public listEmpty: boolean = true;

  /**
   * Initializes subscriptions to the MentionService to react to trigger and query updates.
   */
  ngOnInit() {
    this.mentionService.trigger$.subscribe(t => this.trigger = t);

    this.mentionService.query$.subscribe(q => {
      this.query = q;
      this.filter();
    });

    this.mentionService.showOverlay$.subscribe(val => {
      this.showOverlay = val;
    });
  }

  /**
   * Filters users or channels based on the current trigger and query.
   */
  filter() {
    if (this.trigger === '@') {
      this.filteredItems = this.users.filter(user =>
        (user.displayName || user.name).toLowerCase().includes(this.query.toLowerCase()));
    } else if (this.trigger === '#') {
      this.filteredItems = this.channels.filter(channel =>
        channel.channelName.toLowerCase().includes(this.query.toLowerCase()));
    }

    this.listEmpty = this.filteredItems.length === 0;
  }

  /**
   * Returns filtered users only.
   */
  get filteredUsers(): User[] {
    return this.filteredItems.filter((item): item is User => 'id' in item);
  }

  /**
   * Returns filtered channels only.
   */
  get filteredChannels(): Channel[] {
    return this.filteredItems.filter((item): item is Channel => 'channelId' in item);
  }

  /**
   * Handles selection of a user or channel from the suggestion list.
   * Emits the selected mention and resets the mention state.
   *
   * @param item - The selected user or channel.
   */
  select(item: any) {
    let name = this.trigger === '@' ? `@${item.displayName || item.name}` : `#${item.channelName}`;

    this.mentionSelected.emit(name);
    this.mentionService.reset();
  }

  /**
   * Handles selection of a user specifically.
   *
   * @param user - The selected user.
   */
  handleUserSelect(user: User) {
    const name = `@${user.displayName || user.name}`;

    this.mentionSelected.emit(name);
    this.mentionService.reset();
  }

  /**
   * Handles selection of a channel specifically.
   *
   * @param channel - The selected channel.
   */
  handleChannelSelect(channel: Channel) {
    const name = `#${channel.channelName.slice(1)}`;

    this.mentionSelected.emit(name);
    this.mentionService.reset();
  }

  /**
   * Inserts the selected mention into the target input or contenteditable element.
   *
   * @param text - The mention text to insert.
   */
  public insertMention(text: string) {
    if (!this.targetInputElement) return;

    if (this.targetInputElement instanceof HTMLInputElement) this.insertIntoInput(this.targetInputElement, text);
    else this.insertIntoContentEditable(this.targetInputElement, text);

    this.mentionService.reset();
  }

  /**
   * Inserts the given mention text into a plain input field at the current cursor position.
   * Adds a trailing space after the inserted mention.
   *
   * @param input - The target HTMLInputElement where the mention should be inserted.
   * @param text - The mention text to insert.
   */
  private insertIntoInput(input: HTMLInputElement, text: string) {
    const cursorPos = input.selectionStart ?? input.value.length;
    const textBefore = input.value.slice(0, cursorPos);
    const textAfter = input.value.slice(cursorPos);

    input.value = textBefore + text + ' ' + textAfter;
    input.focus();
    input.setSelectionRange(cursorPos + text.length + 1, cursorPos + text.length + 1);
  }

  /**
   * Deletes the trigger word (e.g. @user or #channel) immediately before the cursor, if present.
   */
  private deleteTriggerWordBeforeCursor(): void {
    if (!this.savedRange) return;

    const range = this.savedRange.cloneRange();
    const container = range.startContainer;
    const offset = range.startOffset;

    if (!this.isTextNode(container)) return;

    const textNode = container as Text;
    const { newText, newOffset } = this.getTextAfterTriggerRemoved(textNode, offset);
    if (newText === null) return;

    textNode.textContent = newText;
    this.resetCursorPosition(textNode, newOffset);
  }

  /**
   * Checks whether a given node is a text node.
   *
   * @param {Node} node - The DOM node to check.
   * @returns {boolean} True if the node is a text node.
   */
  private isTextNode(node: Node): boolean {
    return node.nodeType === Node.TEXT_NODE;
  }

  /**
   * Returns updated text content and new cursor offset with trigger word removed.
   *
   * @param {Text} textNode - The text node being edited.
   * @param {number} offset - Cursor offset within the text node.
   * @returns {{ newText: string | null, newOffset: number }} Resulting text and new offset, or null if no trigger found.
   */
  private getTextAfterTriggerRemoved(textNode: Text, offset: number): { newText: string | null, newOffset: number } {
    const text = textNode.textContent ?? '';
    const beforeCursor = text.slice(0, offset);
    const match = beforeCursor.match(/(?:^|\s)([@#])(\w*)$/);

    if (!match) return { newText: null, newOffset: 0 };

    const triggerStart = offset - match[0].length;
    const newOffset = Math.max(0, Math.min(triggerStart, text.length));
    const newText = beforeCursor.slice(0, newOffset) + text.slice(offset);

    return { newText, newOffset };
  }

  /**
   * Updates the saved range to a new cursor position after text change.
   *
   * @param {Text} textNode - The text node where the cursor should be placed.
   * @param {number} offset - New offset for the cursor.
   */
  private resetCursorPosition(textNode: Text, offset: number): void {
    if (!this.savedRange) return;

    try {
      this.savedRange.setStart(textNode, offset);
      this.savedRange.setEnd(textNode, offset);
    } catch (e) {
      throw new Error('Failed to set cursor position.');
    }
  }

  /**
   * Inserts a mention into a contenteditable element at the current cursor position.
   *
   * This method focuses the editor, ensures a valid cursor range exists,
   * deletes any trigger word (like "@user" or "#channel") before the cursor,
   * inserts the formatted mention span, updates the selection,
   * and saves the new cursor position.
   *
   * @param div - The contenteditable HTML element where the mention should be inserted.
   * @param text - The mention text to insert (e.g., "@username" or "#channel").
   */
  private insertIntoContentEditable(div: HTMLElement, text: string): void {
    div.focus();
    this.ensureCursorPosition(div);
    this.deleteTriggerWordBeforeCursor();

    const range = this.savedRange!.cloneRange();
    this.insertMentionAtRange(range, text);
    this.updateSelection(range);

    this.saveCursorPosition();
  }

  /**
   * Inserts a mention span at the given range position.
   * 
   * @param {Range} range - The current text range.
   * @param {string} text - The mention text to insert.
   */
  private insertMentionAtRange(range: Range, text: string): void {
    const fragment = this.createMentionSpan(text);

    range.deleteContents();
    range.insertNode(fragment);
    range.collapse(false);
  }

  /**
   * Updates the current selection to match the modified range.
   * 
   * @param {Range} range - The range to set the selection to.
   */
  private updateSelection(range: Range): void {
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  /**
   * Creates a span element representing a mention, surrounded by non-breaking spaces.
   *
   * @param text - The mention text (e.g., "@username" or "#channel").
   * @returns A DocumentFragment containing a mention span and surrounding spaces.
   */
  private createMentionSpan(text: string): DocumentFragment {
    const fragment = document.createDocumentFragment();
    const spaceBefore = document.createTextNode('\u00A0');
    const span = document.createElement('span');
    span.className = 'mention';
    span.textContent = text;
    span.contentEditable = 'false';
    const spaceAfter = document.createTextNode('\u00A0');

    fragment.appendChild(spaceBefore);
    fragment.appendChild(span);
    fragment.appendChild(spaceAfter);

    return fragment;
  }

  /**
   * Saves the current cursor position (selection range) in the editor.
   * This is used to restore the cursor later after DOM updates.
   */
  public saveCursorPosition() {
    const selection = window.getSelection();

    if (selection && selection.rangeCount > 0) this.savedRange = selection.getRangeAt(0);
  }

  /**
   * Restores the previously saved cursor position in the editor.
   * If no range was saved, this function does nothing.
   */
  public restoreCursorPosition() {
    const selection = window.getSelection();
    if (this.savedRange && selection) {
      selection.removeAllRanges();
      selection.addRange(this.savedRange.cloneRange());
    }
  }

  /**
   * Ensures that a cursor position is set within the given element.
   * If no cursor range is saved, this function creates one and applies it.
   *
   * @param div - The editor element where the cursor should be ensured.
   */
  private ensureCursorPosition(div: HTMLElement): void {
    if (this.savedRange) return;

    const range = this.createInitialRange(div);
    this.applySelection(range);
    this.savedRange = range;
  }

  /**
   * Creates a range based on the content of the div.
   * If the div is empty, it adds a text node and sets the range there.
   * 
   * @param {HTMLElement} div - The editable container.
   * @returns {Range} - The newly created range.
   */
  private createInitialRange(div: HTMLElement): Range {
    const range = document.createRange();

    if (div.childNodes.length > 0) {
      range.selectNodeContents(div);
      range.collapse(false);
    } else {
      const textNode = document.createTextNode('');
      div.appendChild(textNode);
      range.setStart(textNode, 0);
      range.collapse(true);
    }

    return range;
  }

  /**
   * Applies the given range as the current selection.
   * 
   * @param {Range} range - The range to apply.
   */
  private applySelection(range: Range): void {
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }
}