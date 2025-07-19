import { Injectable } from '@angular/core';

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
}