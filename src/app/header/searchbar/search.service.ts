import { Injectable, inject } from '@angular/core';
import { Firestore, collection, getDocs, query, where } from '@angular/fire/firestore';
import { Timestamp, collectionGroup, doc, getDoc } from 'firebase/firestore';
import { User } from '../../userManagement/user.interface';
import { Channel } from '../../../models/channel.class';
import { UserSharedService } from '../../userManagement/userManagement-service';
import { MessageSharedService } from '../../main-content/message-service';
import { ChatMessage } from '../../main-content/message.model';

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  users: User[] = [];
  channels: Channel[] = [];
  message: ChatMessage[] = [];

  private firestore = inject(Firestore);
  public userService = inject(UserSharedService);
  public messageService = inject(MessageSharedService);

  async search(query: string, userFilter: string[] = [], channelFilter: string[] = []): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    const allMessages = await getDocs(collectionGroup(this.firestore, 'messages'));

    allMessages.forEach(docSnap => {
      const data = docSnap.data() as ChatMessage;
      const path = docSnap.ref.path;

      const matchesText = data.text.toLowerCase().includes(query.toLowerCase());
      if (!matchesText) return;

      const matchesUser = userFilter.length === 0 || userFilter.includes(data.user);
      const matchesChannel = channelFilter.length === 0 || (data.channelId && channelFilter.includes(data.channelId));

      if (matchesUser && matchesChannel) {
        results.push({ message: { ...data, id: docSnap.id }, path });
      }
    });

    return results.slice(0, 20);
  }

}

export interface SearchResult {
  message: ChatMessage;
  path: string;
}