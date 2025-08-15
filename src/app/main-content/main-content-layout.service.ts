import { Injectable, NgZone } from '@angular/core';
import { MainContentComponent } from './main-content.component';

@Injectable({
  providedIn: 'root'
})
/**
 * Service responsible for managing layout-related logic in MainContentComponent,
 * including responsive behavior and dynamic positioning of overlay components.
 */
export class MainContentLayoutService {
  constructor(private ngZone: NgZone) { }

  /**
   * Handles responsive layout changes depending on whether the view is mobile or desktop.
   * 
   * @param context - The MainContentComponent instance.
   */
  handleResponsiveChange(context: MainContentComponent): void {
    context.isMobile ? this.handleMobile(context) : this.handleDesktop(context);
  }

  /**
   * Handles layout logic specific to desktop view.
   * 
   * @param context - The MainContentComponent instance.
   */
  private handleDesktop(context: MainContentComponent): void {
    this.hasSelection(context) ? context.showMainChat = true : this.setDefaultChannelIfNoSelection(context);
  }

  /**
   * Handles layout logic specific to mobile view.
   * 
   * @param context - The MainContentComponent instance.
   */
  private handleMobile(context: MainContentComponent): void {
    if (!context.userHasMadeSelection) this.resetMobileSelection(context);
    else if (this.hasSelection(context)) context.showMainChat = true;
  }

  /**
   * Checks whether a user or channel is currently selected.
   * 
   * @param context - The MainContentComponent instance.
   * @returns True if a user or channel is selected, otherwise false.
   */
  private hasSelection(context: MainContentComponent): boolean {
    return !!(context.selectedChannel || context.selectedUser);
  }

  /**
   * Sets the default channel if the user hasn't made a selection yet.
   * 
   * @param context - The MainContentComponent instance.
   */
  private setDefaultChannelIfNoSelection(context: MainContentComponent): void {
    if (!context.userHasMadeSelection) {
      context.sideNavComponent?.defaultChannel();
      context.showMainChat = true;
    }
  }

  /**
   * Clears the selection and hides the main chat for mobile view.
   * 
   * @param context - The MainContentComponent instance.
   */
  private resetMobileSelection(context: MainContentComponent): void {
    context.showMainChat = false;
    context.selectedChannel = null;
    context.selectedUser = null;
    setTimeout(() => context.sideNavComponent?.clearSelection(), 0);
  }

  /**
   * Handles the edit channel layout positioning when in desktop view.
   * Ensures the layout update is executed after Angular's change detection.
   * 
   * @param context - The MainContentComponent instance.
   */
  handleEditChannel(context: MainContentComponent): void {
    if (!context.isMobile && context.editChannel) {
      this.ngZone.onStable.pipe().subscribe(() => {
        this.dynamicPositionEditChannel(context);
      });
    }
  }

  /**
   * Updates positions for all overlay elements (edit channel, show members, add members).
   * 
   * @param context - The MainContentComponent instance.
   */
  updateOverlayPositions(context: MainContentComponent): void {
    this.dynamicPositionEditChannel(context);
    this.dynamicPositionShowMembers(context);
    this.dynamicPositionAddMembers(context);
  }

  /**
   * Calculates and sets the position for the edit channel overlay.
   * 
   * @param context - The MainContentComponent instance.
   */
  dynamicPositionEditChannel(context: MainContentComponent): void {
    const trigger = document.querySelector('[data-edit-channel-btn]');
    if (trigger) {
      context.editChannelPosition = context.isMobile
        ? { top: 0, left: 0 }
        : this.calculatePosition(trigger as HTMLElement, 0, 'left');
      context.isMobileEdit = context.isMobile;
    }
  }

  /**
   * Calculates and sets the position for the show members overlay.
   * 
   * @param context - The MainContentComponent instance.
   */
  dynamicPositionShowMembers(context: MainContentComponent): void {
    if (context.showMembers) {
      const triggerSelector = context.isMobile
        ? '[data-add-member-btn]'
        : '[data-show-members-btn]';

      const trigger = document.querySelector(triggerSelector);
      if (trigger) {
        const dialogWidth = context.isMobile ? 300 : 415;
        context.showMembersPosition = this.calculatePosition(trigger as HTMLElement, dialogWidth, 'right');
      }
    }
  }

  /**
   * Calculates and sets the position for the add members overlay.
   * 
   * @param context - The MainContentComponent instance.
   */
  dynamicPositionAddMembers(context: MainContentComponent): void {
    if (context.showAddMemberDialog) {
      const trigger = document.querySelector('[data-add-member-btn]');
      if (trigger) {
        const dialogWidth = context.isMobile ? 300 : 514;
        context.addMemberPosition = this.calculatePosition(trigger as HTMLElement, dialogWidth, 'right');
      }
    }
  }

  /**
   * Calculates the top and left position for a dialog based on a triggering element.
   * 
   * @param el - The HTML element that triggers the dialog.
   * @param dialogWidth - The width of the dialog to be positioned.
   * @param align - The horizontal alignment of the dialog ('left' or 'right').
   * @returns An object containing `top` and `left` position values in pixels.
   */
  private calculatePosition(el: HTMLElement, dialogWidth: number, align: 'left' | 'right'): { top: number; left: number } {
    const rect = el.getBoundingClientRect();
    const top = rect.bottom + window.scrollY + 8;
    const left = (align === 'right')
      ? rect.right + window.scrollX - dialogWidth
      : rect.left + window.scrollX;

    return { top, left };
  }
}