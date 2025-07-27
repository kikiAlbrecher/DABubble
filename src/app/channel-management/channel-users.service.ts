import { Injectable, inject } from '@angular/core';
import { Firestore, collection, getDocs } from '@angular/fire/firestore';
import { User } from '../userManagement/user.interface';

@Injectable({
  providedIn: 'root',
})
export class ChannelUsersService {
  private firestore = inject(Firestore);

  /**
   * Retrieves all users who are members of the specified channel.
   * 
   * - A user is considered a member if their `channelIds` object contains the given channelId.
   * - Guest users (with name 'Gast') are only included if their `status` is `true`.
   * 
   * @param channelId - The ID of the channel to check membership for.
   * @returns A promise that resolves to an array of `User` objects who are members of the channel.
   */
  async getUsersForChannel(channelId: string): Promise<User[]> {
    const usersCollection = collection(this.firestore, 'users');
    const snapshot = await getDocs(usersCollection);
    const channelMembers: User[] = [];

    snapshot.forEach((docSnap) => {
      const user = docSnap.data() as User;
      const id = docSnap.id;
      const userChannelIds = user.channelIds as { [key: string]: true };
      const isChannelMember = userChannelIds && userChannelIds[channelId];
      const isActiveGuest = user.name === 'Gast' ? user.status === true : true;

      if (isChannelMember && isActiveGuest) channelMembers.push({ ...user, id });
    });

    return channelMembers;
  }
}