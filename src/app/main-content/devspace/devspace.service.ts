import { Injectable } from '@angular/core';
import { MainContentComponent } from '../main-content.component';
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
    * Toggles the Devspace visibility based on the current device type.
    * 
    * @param context - The MainContentComponent instance.
    */
  toggleDevspace(context: MainContentComponent): void {
    context.isMobile ? this.toggleMobileDevspace(context) : context.showDevspace = !context.showDevspace;
  }

  /**
   * Toggles the Devspace on mobile devices.
   * 
   * @param context - The MainContentComponent instance.
   */
  private toggleMobileDevspace(context: MainContentComponent): void {
    context.showMainChat ? this.closeMobileDevspace(context) : this.prepareMobileDevspaceOpening(context);
  }

  /**
   * Opens Devspace on mobile view, ensures proper context selected.
   * 
   * @param context - The MainContentComponent instance.
   */
  private prepareMobileDevspaceOpening(context: MainContentComponent): void {
    if (!context.selectedChannel || !context.selectedUser) this.selectDefaultChannel(context);

    context.showMainChat = true;

    setTimeout(() => context.showDevspace = true, 0);
  }

  /**
   * Closes Devspace and resets selection in mobile view.
   * 
   * @param context - The MainContentComponent instance.
   */
  private closeMobileDevspace(context: MainContentComponent): void {
    context.showMainChat = false;
    context.selectedUser = null;
    context.selectedChannel = null;

    setTimeout(() => context.showDevspace = false, 0);
  }

  /**
   * Selects the default channel if available.
   * 
   * @param context - The MainContentComponent instance.
   */
  private selectDefaultChannel(context: MainContentComponent): void {
    context.sideNavComponent?.defaultChannel();

    context.selectedChannel =
      context.sideNavComponent?.channels.find(c => c.channelId === context.sideNavComponent?.selectedChannelId) || null;
  }

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