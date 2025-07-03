import { Injectable, inject } from '@angular/core';
import { Channel } from '../../models/channel.class';
import { UserSharedService } from '../userManagement/userManagement-service';
import { User } from "../userManagement/user.interface";
import { BehaviorSubject } from 'rxjs';
import { Firestore, Timestamp, serverTimestamp, collection, getDoc, getDocs, setDoc, addDoc, query, where, onSnapshot } from '@angular/fire/firestore';
import { doc } from 'firebase/firestore';
import { ChatMessage } from './message.model';

@Injectable({
    providedIn: 'root'
})

export class MessageSharedService {

    private firestore = inject(Firestore);
    selectedUser: User | null = null;
    selectedChannel: Channel | null = null;
    userSelected: boolean = false;
    channelSelected: boolean = false;
    messages: ChatMessage[] = [];
    
    constructor(
        public shared: UserSharedService) {}

    private selectedUserSubject = new BehaviorSubject<User | null>(null);
    private selectedChannelSubject = new BehaviorSubject<Channel | null>(null);

    selectedUser$ = this.selectedUserSubject.asObservable();
    selectedChannel$ = this.selectedChannelSubject.asObservable();

    setSelectedUser(user: User | null) {
        this.selectedUserSubject.next(user);
    }

    setSelectedChannel(channel: Channel | null) {
        this.selectedChannelSubject.next(channel);
    }

    async getChannelMessages() {
    const selectedId = this.selectedChannel?.channelId!;
    const chatDocRef = doc(this.firestore, 'channels', selectedId);
    const messagesRef = collection(chatDocRef, 'messages');

    onSnapshot(messagesRef, snapshot => {
        this.messages = snapshot.docs.map(doc => {
        const data = doc.data() as ChatMessage;
        return {
            ...data,
            timeStamp: data.timeStamp instanceof Timestamp 
            ? data.timeStamp.toDate() 
            : data.timeStamp
        };
        });
    });
    console.log(this.messages);
    console.log(this.shared.actualUserID);
    
    
    }

}



