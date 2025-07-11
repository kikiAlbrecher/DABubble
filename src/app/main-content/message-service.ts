import { Injectable, inject, Input } from '@angular/core';
import { formatDate } from '@angular/common';
import { Channel } from '../../models/channel.class';
import { UserSharedService } from '../userManagement/userManagement-service';
import { User } from "../userManagement/user.interface";
import { BehaviorSubject } from 'rxjs';
import { Firestore, deleteDoc, Timestamp, orderBy, serverTimestamp, updateDoc, collection, getDoc, getDocs, setDoc, addDoc, query, where, onSnapshot } from '@angular/fire/firestore';
import { doc } from 'firebase/firestore';
import { ChatMessage } from './message.model';
import { Reaction } from "./../../models/reaction.model"

@Injectable({
    providedIn: 'root'
})

export class MessageSharedService {

    private firestore = inject(Firestore);
    private channelMessagesUnsubscribe: (() => void) | null = null;
    private answerMessagesUnsubscribe: (() => void) | null = null;
    @Input() mode: 'default' | 'thread' = 'default';
    selectedUser: User | null = null;
    selectedChannel: Channel | null = null;
    userSelected: boolean = false;
    channelSelected: boolean = false;
    messages: ChatMessage[] = [];
    groupedMessages: any = {};
    groupedMessageDates: any;
    writeMessageComponentOverlay:boolean = false;
    showChannels: boolean = false;    
    selectedMessage: ChatMessage | undefined;
    //answerMessages: ChatMessage[] = [];
    threadChannelOrUserName:string = "";
    alreadyExisitingReactionId:string = "";
    public answerMessages: ChatMessage[] = [];
    public answerMessages$ = new BehaviorSubject<ChatMessage[]>([]);
    answerId:string = ""

    
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
        if (this.channelMessagesUnsubscribe) {
            this.channelMessagesUnsubscribe(); 
        }
        const selectedId = this.selectedChannel?.channelId!;
        const chatDocRef = doc(this.firestore, 'channels', selectedId);
        const messagesRef = collection(chatDocRef, 'messages');
        const q = query(messagesRef, orderBy('timeStamp'));
        this.channelMessagesUnsubscribe = onSnapshot(q, snapshot => {
            this.messages = snapshot.docs.map(doc => {
            const data = doc.data() as ChatMessage;
            return {
                ...data,
                id: doc.id,
                timeStamp: data.timeStamp instanceof Timestamp 
                ? data.timeStamp.toDate() 
                : data.timeStamp
            };
            });
            const groups = this.messages.reduce((groups:any, message:any) => {
            const date = formatDate(message.timeStamp, 'dd. MMMM yyyy', 'de-DE');
            if (!groups[date]) {
                groups[date] = [];
            }
            groups[date].push(message);
            
            return groups;
            }, {});
            this.groupedMessages = groups;                    
            this.groupedMessageDates = Object.keys(groups);  

            });        
        }

    async getUserMessages(){
        if (this.channelMessagesUnsubscribe) {
            this.channelMessagesUnsubscribe();
            this.channelMessagesUnsubscribe = null;
        }
        this.messages = [];
        this.groupedMessages = {};
        this.groupedMessageDates = [];
        const sortedIds = [this.shared.actualUser.uid, this.selectedUser?.id].sort(); 
        const chatId = sortedIds.join('_');         
        const chatDocRef = doc(this.firestore, 'directMessages', chatId);
        const messagesRef = collection(chatDocRef, 'messages');
        const q = query(messagesRef, orderBy('timeStamp'));
        this.channelMessagesUnsubscribe = onSnapshot(q, snapshot => {
            this.messages = snapshot.docs.map(doc => {
            const data = doc.data() as ChatMessage;
            return {
                ...data,
                id: doc.id,
                timeStamp: data.timeStamp instanceof Timestamp 
                ? data.timeStamp.toDate() 
                : data.timeStamp
            };
            });
            const groups = this.messages.reduce((groups:any, message:any) => {
            const date = formatDate(message.timeStamp, 'dd. MMMM yyyy', 'de-DE');
            if (!groups[date]) {
                groups[date] = [];
            }
            groups[date].push(message);
            
            return groups;
            }, {});
            this.groupedMessages = groups;                    
            this.groupedMessageDates = Object.keys(groups);  

            });       
    }

    async getUserName(writerId: string): Promise<string | undefined> {
        const docRef = doc(this.firestore, "users", writerId);
        const messageWriter = await getDoc(docRef);
        return messageWriter.data()?.['name'];
    }

    async getUserPicture(writerId: string): Promise<string | undefined> {
        const docRef = doc(this.firestore, "users", writerId);
        const messageWriter = await getDoc(docRef);
        return messageWriter.data()?.['picture'];
    }

    closeOverlay() {
        this.writeMessageComponentOverlay = false
        this.showChannels = false;
    }

    async updateMessage(message:ChatMessage, newMessage:string) {
        if (this.selectedChannel) {
            const selectedId = this.selectedChannel?.channelId!;
            const currentMessage = doc(this.firestore, 
                'channels', selectedId, 'messages', message.id);
            await updateDoc(currentMessage, {
                text: newMessage
            });     
        }else if(this.selectedUser) {
            const sortedIds = [this.shared.actualUser.uid, this.selectedUser?.id].sort(); 
            const chatId = sortedIds.join('_'); 
            const currentMessage = doc(this.firestore, 
                'directMessages', chatId, 'messages', message.id);
            await updateDoc(currentMessage, {
                text: newMessage
            });               
        }    
 
    }

    async getAnswerMessage(message:any) {
        this.answerMessages = [];
        this.selectedMessage = message;
        this.shared.threadsVisible$.next(true);    
    }

    async getChannelAnswerMessages() {
        if (this.answerMessagesUnsubscribe) {
            this.answerMessagesUnsubscribe(); 
        }
        this.answerMessages = [];
        const messageId = this.selectedMessage?.id ?? '';
        const channelId = this.selectedMessage?.channelId ?? "";
        const answerRef = collection(this.firestore, 'channels', channelId, 'messages', messageId, 'answers');
        const q = query(answerRef, orderBy('timeStamp'));
        if(answerRef) {
            this.answerMessagesUnsubscribe = onSnapshot(q, snapshot => {
                this.answerMessages = snapshot.docs.map(doc => {
                const data = doc.data() as ChatMessage;                       
                return {
                    ...data,
                    id: doc.id,
                    timeStamp: data.timeStamp instanceof Timestamp 
                    ? data.timeStamp.toDate() 
                    : data.timeStamp
                };            
                })  
                this.answerMessages$.next(this.answerMessages);
            });          
        }          
    }

    async getUserAnswerMessages() {
        if (this.answerMessagesUnsubscribe) {
            this.answerMessagesUnsubscribe(); 
        }
        this.answerMessages = [];
        const messageId = this.selectedMessage?.id ?? '';
        const channelId = this.selectedMessage?.channelId ?? "";
        const answerRef = collection(this.firestore, 'directMessages', channelId, 'messages', messageId, 'answers');
        const q = query(answerRef, orderBy('timeStamp'));
        if(answerRef) {
            this.answerMessagesUnsubscribe = onSnapshot(q, snapshot => {
                this.answerMessages = snapshot.docs.map(doc => {
                const data = doc.data() as ChatMessage;                       
                return {
                    ...data,
                    id: doc.id,
                    timeStamp: data.timeStamp instanceof Timestamp 
                    ? data.timeStamp.toDate() 
                    : data.timeStamp
                };            
                })
            });          
        }          
    }

    async getChannelOrUserName() {
        const actualChannelId = this.selectedMessage?.channelId ?? '';        
        if (this.channelSelected) {
            const channelRef = doc(this.firestore, 'channels', actualChannelId);
            const docSnap = await getDoc(channelRef);
            const data = docSnap.data() as Channel;        
            this.threadChannelOrUserName = data.channelName   
        } else if (this.userSelected) {  
            const displayName = this.selectedUser?.displayName ?? '';    
            this.threadChannelOrUserName = displayName;            
        }       
    }

    async pushEmojiReaction(message:ChatMessage, emoji:any) {
        const alreadyReacted = await this.checkReactionDone(message, emoji);
        if (alreadyReacted) {
        console.log('User already reacted!');
        this.deleteReaction(message)
        } else {
        const channelId = message.channelId ?? '';
        const messageId = message.id ?? '';
        const collectionType = this.channelSelected ? 'channels' : 'directMessages';
        const reactionsRef = collection(this.firestore, collectionType, channelId, 'messages', messageId, 'reactions');
        await addDoc (reactionsRef, {
            user: message.user,
            emoji: emoji,
            timeStamp: serverTimestamp()
        });     
        }
    }

    async checkReactionDone(message:ChatMessage, emoji:any) {
        const channelId = message.channelId ?? '';
        const messageId = message.id ?? '';
        const collectionType = this.channelSelected ? 'channels' : 'directMessages';
        const reactionsRef = collection(this.firestore, collectionType, channelId, 'messages', messageId, 'reactions');
        const q = query(reactionsRef, where("emoji", "==", emoji), where("user", "==", this.shared.actualUser.uid));
        const snapshot = await getDocs(q); 
        snapshot.forEach((doc) => {
        this.alreadyExisitingReactionId = doc.id;
        });
        return !snapshot.empty;
    }

    async deleteReaction (message:ChatMessage) {
        const channelId = message.channelId ?? '';
        const messageId = message.id ?? '';
        const collectionType = this.channelSelected ? 'channels' : 'directMessages';
        await deleteDoc(doc(this.firestore, collectionType, channelId, 'messages', messageId, 'reactions', this.alreadyExisitingReactionId));

    }

    async pushAnswerEmojiReaction(message:ChatMessage, emoji:any) {
        //const alreadyReacted = await this.checkReactionDone(message, emoji);
        // if (alreadyReacted) {
        // console.log('User already reacted!');
        // this.deleteReaction(message)
        // } else {
       await this.getAnswerIds();
        
        const channelId = this.selectedChannel?.channelId ?? '';
        console.log('channelID:',channelId);        
        const messageId = this.selectedMessage?.id ?? '';
        console.log('messageID:',messageId);        
        const answerId = this.answerId ?? '';
        console.log('answerID:',answerId);
        
        const collectionType = this.channelSelected ? 'channels' : 'directMessages';
        const reactionsRef = collection(this.firestore, collectionType, channelId, 'messages', messageId, 'answers', answerId, 'reactions');
        await addDoc (reactionsRef, {
            user: message.user,
            emoji: emoji,
            timeStamp: serverTimestamp()
        });     
        }

    getAnswerIds() {
    
      this.answerMessages.forEach(element => {
        this.answerId = element.id        
      });
      
        
  }    
        
    


}