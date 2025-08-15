import { Injectable, inject, Input } from '@angular/core';
import { formatDate } from '@angular/common';
import { Channel } from '../../models/channel.class';
import { UserSharedService } from '../userManagement/userManagement-service';
import { User } from "../userManagement/user.interface";
import { BehaviorSubject } from 'rxjs';
import { Firestore, deleteDoc, Timestamp, Query, QuerySnapshot, DocumentData, orderBy, serverTimestamp, updateDoc, collection, getDoc, getDocs, setDoc, addDoc, query, where, onSnapshot } from '@angular/fire/firestore';
import { doc } from 'firebase/firestore';
import { ChatMessage } from './message.model';

@Injectable({
    providedIn: 'root'
})
export class MessageSharedService {
    constructor(public shared: UserSharedService) { }

    @Input() mode: 'default' | 'thread' = 'default';

    private firestore = inject(Firestore);
    private channelMessagesUnsubscribe: (() => void) | null = null;
    private answerMessagesUnsubscribe: (() => void) | null = null;
    selectedUser: User | null = null;
    selectedChannel: Channel | null = null;
    userSelected: boolean = false;
    channelSelected: boolean = false;
    messages: ChatMessage[] = [];
    groupedMessages: any = {};
    groupedMessageDates: any;
    writeMessageComponentOverlay: boolean = false;
    showChannels: boolean = false;
    selectedMessage: ChatMessage | undefined;
    threadChannelOrUserName: string = "";
    alreadyExisitingReactionId: string = "";
    public answerMessages: ChatMessage[] = [];
    public answerMessages$ = new BehaviorSubject<ChatMessage[]>([]);
    answerId: string = "";
    public targetMessageText: string | null = null;
    public highlightedMessageId: string | null = null;
    private selectedUserSubject = new BehaviorSubject<User | null>(null);
    private selectedChannelSubject = new BehaviorSubject<Channel | null>(null);
    selectedUser$ = this.selectedUserSubject.asObservable();
    selectedChannel$ = this.selectedChannelSubject.asObservable();

    /**
     * Updates the currently selected user by emitting the new user value
     * to the selectedUserSubject observable.
     * 
     * @param user - The User object to set as selected, or null to clear selection.
     */
    setSelectedUser(user: User | null) {
        this.selectedUser = user;
        this.selectedUserSubject.next(user);
    }

    /**
     * Updates the currently selected channel by emitting the new channel value
     * to the selectedChannelSubject observable.
     * 
     * @param channel - The Channel object to set as selected, or null to clear selection.
     */
    setSelectedChannel(channel: Channel | null) {
        this.selectedChannel = channel;
        this.selectedChannelSubject.next(channel);
    }

    /**
     * Fetches all messages from the currently selected channel
     * and subscribes to real-time updates via Firestore's onSnapshot.
     * If a previous subscription exists, it will be unsubscribed first.
     */
    async getChannelMessages() {
        if (this.channelMessagesUnsubscribe) {
            this.channelMessagesUnsubscribe();
        }
        const selectedId = this.selectedChannel?.channelId!;
        const chatDocRef = doc(this.firestore, 'channels', selectedId);
        const messagesRef = collection(chatDocRef, 'messages');
        const q = query(messagesRef, orderBy('timeStamp'));
        this.channelMessagesUnsubscribe = onSnapshot(q, snapshot => {
            this.handleChannelSnapshot(snapshot);
        });
    }

    /**
     * Processes a Firestore snapshot of messages by converting each document
     * into a ChatMessage object and grouping them by date.
     * 
     * @param snapshot - Firestore QuerySnapshot containing message documents.
     */
    private handleChannelSnapshot(snapshot: QuerySnapshot<DocumentData>) {
        this.messages = this.mapSnapshotToMessages(snapshot);
        const groups = this.groupMessagesByDate(this.messages);
        this.groupedMessages = groups;
        this.groupedMessageDates = Object.keys(groups);

        if (this.targetMessageText) {
            setTimeout(() => {
                const el = document.querySelector('.messages-container');
                if (el && el.textContent?.includes(this.targetMessageText!)) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    this.targetMessageText = null;
                }
            }, 200);
        }
    }

    /**
     * Maps Firestore snapshot documents to an array of ChatMessage objects.
     * Converts Firestore Timestamps into JavaScript Date objects if necessary.
     * 
     * @param snapshot - Firestore snapshot containing message documents.
     * @returns Array of ChatMessage objects.
     */
    private mapSnapshotToMessages(snapshot: QuerySnapshot<DocumentData>): ChatMessage[] {
        return snapshot.docs.map(doc => {
            const data = doc.data() as ChatMessage;
            return {
                ...data,
                id: doc.id,
                timeStamp: data.timeStamp instanceof Timestamp
                    ? data.timeStamp.toDate()
                    : data.timeStamp
            };
        });
    }

    /**
     * Groups messages by their date in 'dd. MMMM yyyy' format (German locale).
     * 
     * @param messages - Array of ChatMessage objects to be grouped.
     * @returns Object with date strings as keys and arrays of messages as values.
     */
    private groupMessagesByDate(messages: ChatMessage[]): { [date: string]: ChatMessage[] } {
        return messages.reduce((groups: any, message: any) => {
            const date = formatDate(message.timeStamp, 'dd. MMMM yyyy', 'de-DE');
            if (!groups[date]) {
                groups[date] = [];
            }
            groups[date].push(message);
            return groups;
        }, {});
    }

    /**
     * Fetches and subscribes to direct messages between the current user and the selected user.
     * It resets local state, sets up a Firestore listener, and processes incoming message data.
     */
    async getUserMessages() {
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
            this.handleUserMessageSnapshot(snapshot);
        });
    }

    /**
     * Processes a Firestore snapshot of direct messages by converting them
     * into structured message objects and grouping them by date.
     * 
     * @param snapshot - Firestore snapshot containing message documents.
     */
    private handleUserMessageSnapshot(snapshot: QuerySnapshot<DocumentData>) {
        this.messages = this.mapSnapshotToUserMessages(snapshot);
        const groups = this.groupUserMessagesByDate(this.messages);
        this.groupedMessages = groups;
        this.groupedMessageDates = Object.keys(groups);

        if (this.targetMessageText) {
            setTimeout(() => {
                const el = document.querySelector('.messages-container');
                if (el && el.textContent?.includes(this.targetMessageText!)) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    this.targetMessageText = null;
                }
            }, 200);
        }
    }

    /**
     * Converts Firestore snapshot documents into ChatMessage objects with correct timestamp formatting.
     * 
     * @param snapshot - Firestore snapshot containing message documents.
     * @returns Array of ChatMessage objects.
     */
    private mapSnapshotToUserMessages(snapshot: QuerySnapshot<DocumentData>): ChatMessage[] {
        return snapshot.docs.map(doc => {
            const data = doc.data() as ChatMessage;
            return {
                ...data,
                id: doc.id,
                timeStamp: data.timeStamp instanceof Timestamp
                    ? data.timeStamp.toDate()
                    : data.timeStamp
            };
        });
    }

    /**
     * Groups messages by date string ('dd. MMMM yyyy') using the German locale.
     * 
     * @param messages - Array of ChatMessage objects to group.
     * @returns Object containing grouped messages by date.
     */
    private groupUserMessagesByDate(messages: ChatMessage[]): { [date: string]: ChatMessage[] } {
        return messages.reduce((groups: any, message: any) => {
            const date = formatDate(message.timeStamp, 'dd. MMMM yyyy', 'de-DE');

            if (!groups[date]) groups[date] = [];
            groups[date].push(message);
            return groups;
        }, {});
    }

    /**
     * Retrieves the display name of a user based on their user ID.
     * 
     * This method queries the "users" collection in Firestore and
     * returns the value stored in the 'name' field of the user document.
     * 
     * @param writerId - The ID of the user whose name should be fetched.
     * @returns A promise resolving to the user's name or undefined if not found.
     */
    async getUserName(writerId: string): Promise<string | undefined> {
        const docRef = doc(this.firestore, "users", writerId);
        const messageWriter = await getDoc(docRef);
        return messageWriter.data()?.['name'];
    }

    /**
     * Retrieves the profile picture URL of a user based on their user ID.
     * 
     * This method queries the "users" collection in Firestore and
     * returns the value stored in the 'picture' field of the user document.
     * 
     * @param writerId - The ID of the user whose picture should be fetched.
     * @returns A promise resolving to the user's picture URL or undefined if not found.
     */
    async getUserPicture(writerId: string): Promise<string | undefined> {
        const docRef = doc(this.firestore, "users", writerId);
        const messageWriter = await getDoc(docRef);
        return messageWriter.data()?.['picture'];
    }

    /**
     * Closes any currently open overlay related to writing messages or channel view.
     * 
     * This method sets internal state flags to false, which will hide
     * the message composition overlay and channel selection view.
     */
    closeOverlay() {
        this.writeMessageComponentOverlay = false;
        this.showChannels = false;
    }

    /**
     * Updates the text of a message, depending on whether it belongs to a channel
     * or a direct message thread.
     *
     * @param message - The message object to be updated.
     * @param newMessage - The new text content to update.
     */
    async updateMessage(message: ChatMessage, newMessage: string) {
        if (this.selectedChannel) {
            await this.updateMessageInFirestore('channels', this.selectedChannel.channelId, message.id, newMessage);
        } else if (this.selectedUser) {
            const sortedIds = [this.shared.actualUser.uid, this.selectedUser.id].sort();
            const chatId = sortedIds.join('_');
            await this.updateMessageInFirestore('directMessages', chatId, message.id, newMessage);
        }
    }

    /**
     * Performs the Firestore update operation for a given message path.
     *
     * @param collectionType - Either 'channels' or 'directMessages'.
     * @param parentId - ID of the channel or chat thread.
     * @param messageId - The ID of the message to update.
     * @param newText - The new text content for the message.
     */
    private async updateMessageInFirestore(collectionType: string, parentId: string, messageId: string, newText: string) {
        const messageRef = doc(this.firestore, collectionType, parentId, 'messages', messageId);
        await updateDoc(messageRef, { text: newText });
    }

    /**
     * Sets the selected message for which thread answers should be displayed.
     * 
     * This method clears any previously loaded answer messages,
     * sets the provided message as the currently selected message,
     * and triggers the visibility of the thread panel.
     * 
     * @param message - The message object for which the thread should be opened.
     */
    async getAnswerMessage(message: any) {
        this.answerMessages = [];
        this.selectedMessage = message;
        this.shared.threadsVisible$.next(true);
    }

    /**
     * Initializes the answer messages loading process by
     * unsubscribing from any previous listeners,
     * clearing the current answerMessages array,
     * and starting a new subscription to answer messages.
     */
    async getChannelAnswerMessages() {
        if (this.answerMessagesUnsubscribe) this.answerMessagesUnsubscribe();

        this.answerMessages = [];
        this.subscribeToAnswerMessagesQuery(this.getAnswerMessagesQuery());
    }

    /**
     * Creates a Firestore query for the 'answers' collection
     * of the selected message within a channel, ordered by timestamp.
     * 
     * @returns Firestore query object for answers.
     */
    private getAnswerMessagesQuery() {
        const messageId = this.selectedMessage?.id ?? '';
        const channelId = this.selectedMessage?.channelId ?? '';
        const answerRef = collection(this.firestore, 'channels', channelId, 'messages', messageId, 'answers');
        return query(answerRef, orderBy('timeStamp'));
    }

    /**
     * Subscribes to the Firestore query for answer messages,
     * maps snapshot documents into ChatMessage objects with converted timestamps,
     * updates local answerMessages state and emits the new value.
     * 
     * @param q Firestore query to listen to.
     */
    private subscribeToAnswerMessagesQuery(q: Query) {
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
            });
            this.answerMessages$.next(this.answerMessages);
        });
    }

    /**
     * Starts the process to load user answer messages by
     * unsubscribing from any existing listener,
     * clearing the current answerMessages array,
     * and subscribing to new data.
     */
    async getUserAnswerMessages() {
        if (this.answerMessagesUnsubscribe) {
            this.answerMessagesUnsubscribe();
        }
        this.answerMessages = [];
        const q = this.getUserAnswerMessagesQuery();
        this.subscribeToUserAnswerMessagesQuery(q);
    }

    /**
     * Builds a Firestore query for the 'answers' subcollection
     * of the selected direct message, ordered by timestamp.
     * 
     * @returns Firestore query object for user answers.
     */
    private getUserAnswerMessagesQuery() {
        const messageId = this.selectedMessage?.id ?? '';
        const channelId = this.selectedMessage?.channelId ?? '';
        const answerRef = collection(this.firestore, 'directMessages', channelId, 'messages', messageId, 'answers');
        return query(answerRef, orderBy('timeStamp'));
    }

    /**
     * Subscribes to the given Firestore query for user answer messages,
     * processes snapshot documents into ChatMessage objects with converted timestamps,
     * updates local state and emits the updated answerMessages observable.
     * 
     * @param q Firestore query to subscribe to.
     */
    private subscribeToUserAnswerMessagesQuery(q: Query) {
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
            });
            this.answerMessages$.next(this.answerMessages);
        });
    }

    /**
     * Retrieves and sets the display name for the current thread context.
     * 
     * If a channel is selected, it fetches the channel's name from Firestore.
     * If a user is selected instead, it uses the user's display name.
     * The resulting name is stored in the threadChannelOrUserName property.
     */
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

    /**
     * Adds or removes an emoji reaction to a message in Firestore.
     * 
     * Checks if the current user has already reacted with the given emoji.
     * If yes, it deletes the existing reaction; otherwise, it adds a new reaction document.
     * The reaction is stored in the appropriate subcollection depending on whether
     * the message is in a channel or a direct message.
     * 
     * @param message - The ChatMessage object to react to.
     * @param emoji - The emoji reaction to add or remove.
     */
    async pushEmojiReaction(message: ChatMessage, emoji: any) {
        const channelId = message.channelId ?? '';
        const messageId = message.id ?? '';
        const collectionType = this.channelSelected ? 'channels' : 'directMessages';
        const reactionsRef = collection(this.firestore, collectionType, channelId, 'messages', messageId, 'reactions');
        const alreadyReacted = await this.checkReactionDone(reactionsRef, message, emoji);
        if (alreadyReacted) {
            this.deleteReaction(reactionsRef, message)
        } else {
            await addDoc(reactionsRef, {
                user: this.shared.actualUserID,
                emoji: emoji,
                timeStamp: serverTimestamp()
            });
        }
    }

    /**
     * Checks if the current user has already reacted with a specific emoji
     * on a given message by querying the reactions subcollection.
     * 
     * Stores the ID of the existing reaction if found for later deletion.
     * 
     * @param reactionsRef - Firestore collection reference to the reactions subcollection.
     * @param message - The message to check reactions for.
     * @param emoji - The emoji to check if already reacted.
     * @returns A boolean indicating whether the reaction by the user exists.
     */
    async checkReactionDone(reactionsRef: any, message: ChatMessage, emoji: any) {
        const q = query(reactionsRef, where("emoji", "==", emoji), where("user", "==", this.shared.actualUser.uid));
        const snapshot = await getDocs(q);
        snapshot.forEach((doc) => {
            this.alreadyExisitingReactionId = doc.id;
        });
        return !snapshot.empty;
    }

    /**
     * Deletes an existing reaction document from the reactions subcollection
     * using the stored reaction document ID.
     * 
     * @param reactionsRef - Firestore collection reference to the reactions subcollection.
     * @param message - The message for which the reaction should be deleted.
     */
    async deleteReaction(reactionsRef: any, message: ChatMessage) {
        const channelId = message.channelId ?? '';
        const messageId = message.id ?? '';
        const collectionType = this.channelSelected ? 'channels' : 'directMessages';
        await deleteDoc(doc(reactionsRef, this.alreadyExisitingReactionId));
    }

    /**
     * Prepares the Firestore collection reference for reactions
     * on a specific answer message, based on the current selection state.
     * 
     * @returns Firestore collection reference for answer reactions.
     */
    private async prepareAnswerReactionsCollection() {
        await this.getAnswerIds();
        const answerId = this.answerId ?? '';
        const channelId = this.selectedChannel?.channelId ?? '';
        const chatId = this.selectedMessage?.channelId ?? '';
        const channelTyp = this.channelSelected ? channelId : chatId;
        const messageId = this.selectedMessage?.id ?? '';
        const collectionType = this.channelSelected ? 'channels' : 'directMessages';
        return collection(this.firestore, collectionType, channelTyp, 'messages', messageId, 'answers', answerId, 'reactions');
    }

    /**
     * Adds or removes an emoji reaction on the selected answer message.
     * Checks if the user already reacted, deletes reaction if exists,
     * otherwise adds a new emoji reaction.
     * 
     * @param message - The ChatMessage object to react to.
     * @param emoji - The emoji reaction to toggle.
     */
    async pushAnswerEmojiReaction(message: ChatMessage, emoji: any) {
        const reactionsRef = await this.prepareAnswerReactionsCollection();
        const alreadyReacted = await this.checkReactionDone(reactionsRef, message, emoji);
        if (alreadyReacted) {
            this.deleteReaction(reactionsRef, message);
        } else {
            await addDoc(reactionsRef, {
                user: this.shared.actualUserID,
                emoji: emoji,
                timeStamp: serverTimestamp()
            });
        }
    }

    /**
     * Iterates through the current list of answer messages
     * and updates the `answerId` property with the ID of each message.
     * 
     * Note: This method sets `answerId` to the last message's ID in the list.
     */
    getAnswerIds() {
        this.answerMessages.forEach(element => {
            this.answerId = element.id
        });
    }
}