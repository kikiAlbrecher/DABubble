import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { User } from '../../userManagement/user.interface';
import { Channel } from '../../../models/channel.class';
import { MentionService } from '../mention.service';
import { UsersComponent } from '../../style-components/users/users.component';
import { ChannelsComponent } from '../../style-components/channels/channels.component';

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

  private savedRange: Range | null = null;
  public mentionService = inject(MentionService);
  public showOverlay: boolean = false;
  public listEmpty: boolean = true;

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

  get filteredUsers(): User[] {
    return this.filteredItems.filter((item): item is User => 'id' in item);
  }

  get filteredChannels(): Channel[] {
    return this.filteredItems.filter((item): item is Channel => 'channelId' in item);
  }

  select(item: any) {
    let name = this.trigger === '@' ? `@${item.displayName || item.name}` : `#${item.channelName}`;
    this.mentionSelected.emit(name);
    this.mentionService.reset();
  }

  handleUserSelect(user: User) {
    const name = `@${user.displayName || user.name}`;
    this.mentionSelected.emit(name);
    this.mentionService.reset();
  }

  handleChannelSelect(channel: Channel) {
    const name = `#${channel.channelName.slice(1)}`;
    this.mentionSelected.emit(name);
    this.mentionService.reset();
  }

  public insertMention(text: string) {
    if (!this.targetInputElement) return;

    if (this.targetInputElement instanceof HTMLInputElement) {
      this.insertIntoInput(this.targetInputElement, text);
    } else {
      this.insertIntoContentEditable(this.targetInputElement, text);
    }

    this.mentionService.reset();
  }

  private insertIntoInput(input: HTMLInputElement, text: string) {
    const cursorPos = input.selectionStart ?? input.value.length;
    const textBefore = input.value.slice(0, cursorPos);
    const textAfter = input.value.slice(cursorPos);
    input.value = textBefore + text + ' ' + textAfter;
    input.focus();
    input.setSelectionRange(cursorPos + text.length + 1, cursorPos + text.length + 1);
  }

  private deleteTriggerWordBeforeCursor(): void {
    if (!this.savedRange) return;

    const range = this.savedRange.cloneRange();
    const container = range.startContainer;
    const offset = range.startOffset;

    if (container.nodeType !== Node.TEXT_NODE) return;

    const textNode = container as Text;
    const text = textNode.textContent ?? '';
    const beforeCursor = text.slice(0, offset);
    const match = beforeCursor.match(/(?:^|\s)([@#])(\w*)$/);

    if (!match) return;

    const triggerStart = offset - match[0].length;
    const newOffset = Math.max(0, Math.min(triggerStart, text.length));

    const newText = beforeCursor.slice(0, newOffset) + text.slice(offset);
    textNode.textContent = newText;

    try {
      this.savedRange.setStart(textNode, newOffset);
      this.savedRange.setEnd(textNode, newOffset);
    } catch (e) {
      console.error('Failed to set cursor position:', e);
    }
  }

  /**
   * Finds a trigger word (e.g. @word or #word) before the cursor.
   * @param {Text} textNode - The text node containing the cursor.
   * @param {number} offset - The offset of the cursor within the node.
   * @returns {RegExpMatchArray | null}
   */
  private findTriggerMatch(textNode: Text, offset: number): RegExpMatchArray | null {
    const text = textNode.textContent ?? '';
    const beforeCursor = text.slice(0, offset);
    return beforeCursor.match(/(?:^|\s)([@#])(\w*)$/);
  }

  /**
   * Removes the matched trigger word from the text node and updates the cursor position.
   * @param {Text} textNode - The text node to update.
   * @param {number} offset - The current cursor offset.
   * @param {number} matchLength - The length of the matched trigger word.
   */
  private removeTriggerMatch(textNode: Text, offset: number, matchLength: number): void {
    const text = textNode.textContent ?? '';
    const triggerStart = offset - matchLength;
    const newText = text.slice(0, triggerStart) + text.slice(offset);

    textNode.textContent = newText;
    this.savedRange!.setStart(textNode, triggerStart);
    this.savedRange!.setEnd(textNode, triggerStart);
  }


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
   * @param {Range} range - The range to set the selection to.
   */
  private updateSelection(range: Range): void {
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

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

  public saveCursorPosition() {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      this.savedRange = selection.getRangeAt(0);
    }
  }

  public restoreCursorPosition() {
    const selection = window.getSelection();
    if (this.savedRange && selection) {
      selection.removeAllRanges();
      selection.addRange(this.savedRange.cloneRange());
    }
  }

  private ensureCursorPosition(div: HTMLElement): void {
    if (this.savedRange) return;

    const range = this.createInitialRange(div);
    this.applySelection(range);
    this.savedRange = range;
  }

  /**
   * Creates a range based on the content of the div.
   * If the div is empty, it adds a text node and sets the range there.
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
   * @param {Range} range - The range to apply.
   */
  private applySelection(range: Range): void {
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }
}