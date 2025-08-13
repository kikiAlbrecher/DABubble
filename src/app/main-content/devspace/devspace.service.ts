import { Injectable } from '@angular/core';
import { ElementRef } from '@angular/core';

/**
 * Service to manage operations on the rich text editor element in the DevspaceComponent.
 * Provides access to the native editor element and utilities for reading, clearing,
 * and checking content state.
 */
@Injectable({ providedIn: 'root' })
export class DevspaceService {
  private editorRef: ElementRef<HTMLDivElement> | null = null;

  /**
    * Sets a reference to the editor element.
    * 
    * @param ref - A reference to the editor's HTMLDivElement.
    */
  setEditorRef(ref: ElementRef<HTMLDivElement>) {
    this.editorRef = ref;
  }

  /**
   * Returns the trimmed plain text content of the editor.
   * 
   * @returns The text content as a string, or an empty string if unavailable.
   */
  getEditorTextContent(): string {
    return this.editorRef?.nativeElement?.textContent?.trim() || '';
  }

  /**
   * Clears the inner HTML content of the editor.
   */
  clearEditor() {
    if (this.editorRef) this.editorRef.nativeElement.innerHTML = '';
  }

  /**
   * Checks whether the editor is currently empty.
   * 
   * @returns `true` if the editor contains no text content, otherwise `false`.
   */
  isEditorEmpty(): boolean {
    return this.getEditorTextContent().length === 0;
  }

  /**
   * Returns the native HTML element of the editor.
   * 
   * @returns The HTMLElement if available, otherwise `null`.
   */
  getEditorNativeElement(): HTMLElement | null {
    return this.editorRef?.nativeElement ?? null;
  }
}