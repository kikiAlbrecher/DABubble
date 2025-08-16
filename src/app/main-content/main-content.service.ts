import { Injectable } from '@angular/core';
import { MainContentComponent } from './main-content.component';
import { Channel } from '../../models/channel.class';

@Injectable({
  providedIn: 'root'
})
export class MainContentService {
  /**
   * Handles component initialization logic for MainContentComponent.
   * Starts the display logic, subscribes to valid users and profile open events.
   *
   * @param context - The MainContentComponent instance
   */
  handleInit(context: MainContentComponent): void {
    this.startDisplay(context);

    context.shared.subscribeValidUsers();

    context.shared.allValidUsers$.subscribe(users => {
      context.users = users;
    });

    context.userHasMadeSelection = false;

    context.sharedHeader.profileOpen$.subscribe(() => {
      context.selectedUser = context.shared.actualUser;
      context.showProfile = true;
    });
  }

  /**
   * Handles initial display state depending on whether the app runs on mobile or desktop.
   * 
   * @param context - The MainContentComponent instance
   */
  startDisplay(context: MainContentComponent): void {
    if (context.isMobile) {
      context.showMainChat = false;
      context.selectedChannel = null;
      context.selectedUser = null;
      context.isInitializing = false;
    } else {
      setTimeout(() => {
        if (!context.userHasMadeSelection) {
          context.sideNavComponent?.defaultChannel();
          context.showMainChat = true;
        }
        context.isInitializing = false;
      });
    }
  }

  /**
   * Handles the result of a channel creation.
   * If successful, opens the member-add flow.
   * 
   * @param context - The MainContentComponent instance
   * @param event - Result object with success flag, message, and optionally the created channel
   */
  handleCreateChannel(context: MainContentComponent, event: { success: boolean; message: string; channel?: Channel }) {
    context.statusMessageAlternatives(event);

    if (event.success && event.channel) {
      context.selectedChannel = event.channel;

      setTimeout(() => {
        context.showAddChannelDialog = false;
        context.addChannelMember = true;
      }, 2000);
    } else return;
  }

  /**
   * Handles opening the "Add Member" dialog depending on device type and position.
   * 
   * @param context - MainContentComponent instance
   * @param event - Optional MouseEvent or fixed {top, left} coordinates
   */
  openDialogAddMember(context: MainContentComponent, event?: MouseEvent | { top: number; left: number }): void {
    context.isMobileEditContext = false;
    const position = this.extractPosition(event);

    context.isMobile ? this.mobileAddMember(context, position) : this.desktopAddMember(context, position);
  }

  /**
   * Extracts position coordinates from MouseEvent or explicit top/left values.
   * 
   * @param event - MouseEvent or position object
   * @returns Extracted position
   */
  private extractPosition(event?: MouseEvent | { top: number; left: number }): { top: number; left: number } {
    if (event && 'top' in event && 'left' in event) return event;
    if (event instanceof MouseEvent) return { top: event.clientY, left: event.clientX };

    return { top: 200, left: 0 };
  }

  /**
   * Handles dialog opening in mobile view with slight delay animation.
   * 
   * @param context - MainContentComponent instance
   * @param position - Position to display dialog
   */
  private mobileAddMember(context: MainContentComponent, position: { top: number; left: number }): void {
    context.addMemberPosition = position;
    context.showAddMemberDialog = false;
    context.showMembers = true;

    setTimeout(() => {
      context.showMembers = false;
      context.showAddMemberDialog = true;
    }, 50);
  }

  /**
   * Handles dialog opening in desktop view.
   * 
   * @param context - MainContentComponent instance
   * @param position - Position to display dialog
   */
  private desktopAddMember(context: MainContentComponent, position: { top: number; left: number }): void {
    context.addMemberPosition = position;
    context.showAddMemberDialog = true;
  }
}