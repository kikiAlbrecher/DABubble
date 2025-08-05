import { Injectable, inject } from '@angular/core';
import { Firestore, doc, getDoc, onSnapshot } from '@angular/fire/firestore';
import { BehaviorSubject, Subscription } from 'rxjs';
import { Channel } from '../../models/channel.class';
import { UserSharedService } from '../userManagement/userManagement-service';
import { User } from '../userManagement/user.interface';

@Injectable({
  providedIn: 'root'
})
export class ChannelSharedService {
  private firestore = inject(Firestore);
  private userService = inject(UserSharedService);

  allValidChannels$ = new BehaviorSubject<Channel[]>([]);

  private unsub?: () => void;
  private userSub?: Subscription;

  /**
   * Subscribes to the currently logged-in user and listens for changes
   * to their associated channel list in Firestore.
   */
  subscribeValidChannels(): void {
    this.userSub?.unsubscribe();
    this.userSub = this.userService.actualUser$.subscribe(userId => {
      if (!userId) return;

      const userDocRef = doc(this.firestore, 'users', userId);

      if (this.unsub) this.unsub();

      this.unsub = onSnapshot(userDocRef, (userSnap) => this.handleUserSnapshot(userSnap));
    });
  }

  /**
   * Handles Firestore snapshot updates for the current user document,
   * retrieves the list of channel IDs, and loads the corresponding channels.
   * 
   * @param userSnap - The Firestore snapshot of the user document.
   */
  private async handleUserSnapshot(userSnap: any): Promise<void> {
    const userData = userSnap.data() as User;

    if (!userData?.channelIds) {
      this.allValidChannels$.next([]);
      return;
    }
    const channelIds = Object.keys(userData.channelIds);
    const channels = await Promise.all(
      channelIds.map(channelId => this.loadChannel(channelId))
    );

    this.allValidChannels$.next(
      channels.filter((channel): channel is Channel => !!channel)
    );
  }

  /**
   * Loads a single channel from Firestore based on its ID.
   * 
   * @param channelId - The ID of the channel to load.
   * @returns A `Channel` instance if found, otherwise `null`.
   */
  private async loadChannel(channelId: string): Promise<Channel | null> {
    try {
      const channelDocRef = doc(this.firestore, 'channels', channelId);
      const channelDoc = await getDoc(channelDocRef);

      if (channelDoc.exists()) {
        return new Channel({ ...channelDoc.data(), channelId });
      }
    } catch (error) {
      throw new Error(`Fehler beim Laden von Channel ${channelId}.`);
    }

    return null;
  }

  /**
   * Unsubscribes from the Firestore snapshot listener and the user observable
   * to prevent memory leaks.
   */
  unsubscribeChannels() {
    if (this.unsub) {
      this.unsub();
      this.unsub = undefined;
    }

    this.userSub?.unsubscribe();
  }
}