import { Injectable, inject } from '@angular/core';
import { Firestore, doc, getDoc, onSnapshot } from '@angular/fire/firestore';
import { BehaviorSubject } from 'rxjs';
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

  subscribeValidChannels(): void {
    const userId = this.userService.actualUserID;
    if (!userId) return;
    if (this.unsub) return;

    const userDocRef = doc(this.firestore, 'users', userId);
    this.unsub = onSnapshot(userDocRef, (userSnap) => this.handleUserSnapshot(userSnap));
  }

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

  private async loadChannel(channelId: string): Promise<Channel | null> {
    try {
      const channelDocRef = doc(this.firestore, 'channels', channelId);
      const channelDoc = await getDoc(channelDocRef);

      if (channelDoc.exists()) {
        return new Channel({ ...channelDoc.data(), channelId });
      }
    } catch (error) {
      console.error(`Fehler beim Laden von Channel ${channelId}:`, error);
    }

    return null;
  }
}