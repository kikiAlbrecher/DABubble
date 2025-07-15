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

  subscribeValidChannels(): void {
    const userId = this.userService.actualUserID;
    if (!userId) return;

    const userDocRef = doc(this.firestore, 'users', userId);
    onSnapshot(userDocRef, (userSnap) => this.handleUserSnapshot(userSnap));
  }

  private async handleUserSnapshot(userSnap: any): Promise<void> {
    const userData = userSnap.data() as User;
    if (!userData?.channelIds) {
      this.allValidChannels$.next([]);
      return;
    }

    const channelIds = Object.keys(userData.channelIds);
    const channels = await this.fetchChannels(channelIds);
    this.allValidChannels$.next(channels);
  }

  private async fetchChannels(channelIds: string[]): Promise<Channel[]> {
    const channels: Channel[] = [];

    for (const channelId of channelIds) {
      const channel = await this.loadChannel(channelId);
      if (channel) channels.push(channel);
    }

    return channels;
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