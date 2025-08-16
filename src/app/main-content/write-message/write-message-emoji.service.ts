import { Injectable } from '@angular/core';
import { WriteMessageComponent } from './write-message.component';
import { MentionUtilsService } from '../../search/mention-utils.service';

@Injectable({
  providedIn: 'root'
})
export class WriteMessageEmojiService {
  /**
   * Adds an emoji to the editor at the current cursor position.
   * 
   * @param context - The WriteMessageComponent instance.
   * @param selected - The selected emoji object.
   */
  addEmoji(context: WriteMessageComponent, selected: any): void {
    const emoji: string = selected.emoji.native;
    const div = context.editor.nativeElement;

    context.mentionComponent?.restoreCursorPosition();
    const range = this.getCurrentSelectionRange();
    if (!range) return;

    const emojiNode = this.insertEmojiAtCursor(range, emoji);
    this.updateCursorAfterEmoji(context, emojiNode);
    this.syncEditorContentToForm(context);
    this.closeEmojiOverlay(context);
  }

  /**
   * Gets the current text selection range in the editor.
   * 
   * @returns A cloned Range object or null if no selection is found.
   */
  private getCurrentSelectionRange(): Range | null {
    const selection = window.getSelection();

    return selection?.getRangeAt(0).cloneRange() ?? null;
  }

  /**
   * Inserts the emoji as a text node at the current cursor position.
   * 
   * @param range - The range where the emoji should be inserted.
   * @param emoji - The emoji character to insert.
   */
  private insertEmojiAtCursor(range: Range, emoji: string): Node {
    const emojiNode = document.createTextNode(emoji);

    range.insertNode(emojiNode);
    return emojiNode;
  }

  /**
   * Updates the cursor position after an emoji node is inserted.
   * 
   * This method creates a new `Range` object and sets the cursor position immediately after the specified node. 
   * It then updates the current selection to reflect this position and saves the 
   * cursor state using the mention component, if available.
   *
   * @param context - The WriteMessageComponent instance.
   * @param {Node} node - The DOM node after which the cursor should be placed.
   */
  private updateCursorAfterEmoji(context: WriteMessageComponent, node: Node): void {
    const range = document.createRange();
    range.setStartAfter(node);
    range.collapse(true);

    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    context.mentionComponent?.saveCursorPosition();
  }

  /**
   * Syncs the editor's HTML content back to the message form control.
   * 
   * @param context - The WriteMessageComponent instance.
   */
  private syncEditorContentToForm(context: WriteMessageComponent): void {
    MentionUtilsService.syncEditorToForm(context.editor.nativeElement, context.messageForm.controls['message']);
  }

  /**
   * Closes all emoji overlay popups in both main and thread modes.
   * 
   * This method sets both `emojiOverlay` (for the main chat view) and `emojiThreadOverlay` 
   * (for the thread reply view) to false, effectively hiding any open emoji pickers from the UI.
   * 
   * @param context - The WriteMessageComponent instance.
   */
  private closeEmojiOverlay(context: WriteMessageComponent): void {
    context.emojiOverlay = false;
    context.emojiThreadOverlay = false;
  }
}
