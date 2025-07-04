import { Injectable, inject } from '@angular/core';
import { Firestore, collection, getDocs } from '@angular/fire/firestore';
import { User } from '../userManagement/user.interface';

@Injectable({
  providedIn: 'root',
})
export class ChannelUsersService {
  private firestore = inject(Firestore);

  async getUsersForChannel(channelId: string): Promise<User[]> {
    const usersCollection = collection(this.firestore, 'users');
    const snapshot = await getDocs(usersCollection);

    const channelMembers: User[] = [];

    snapshot.forEach((docSnap) => {
      const user = docSnap.data() as User;
      const id = docSnap.id;

      const userChannelIds = user.channelIds as { [key: string]: true };

      if (user.channelIds && user.channelIds[channelId]) {
        channelMembers.push({ ...user, id });
      }
    });

    return channelMembers;
  }
}