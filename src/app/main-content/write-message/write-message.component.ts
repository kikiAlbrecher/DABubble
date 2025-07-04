import { Component, Input, Output, EventEmitter, inject, OnChanges, OnInit, SimpleChanges, HostListener } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Firestore, serverTimestamp, collection, getDoc, getDocs, setDoc, addDoc, query, where, onSnapshot } from '@angular/fire/firestore';
import { doc } from 'firebase/firestore';
import { User } from '../../userManagement/user.interface';
import { Channel } from '../../../models/channel.class';
import { UserSharedService } from '../../userManagement/userManagement-service';
import { ChannelsComponent } from '../../style-components/channels/channels.component';
import { UsersComponent } from '../../style-components/users/users.component';

@Component({
  selector: 'app-write-message',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CommonModule,
    ChannelsComponent,
    UsersComponent
  ],
  templateUrl: './write-message.component.html',
  styleUrl: './write-message.component.scss'
})
export class WriteMessageComponent implements OnInit, OnChanges {

  constructor(public shared: UserSharedService) { }

  @Input() user!: User;
  @Input() selectedUser: User | null = null;
  @Input() selectedChannel: Channel | null = null;
  @Output() selectUser = new EventEmitter<User>();

  textError: boolean = false;
  chatExists: boolean = true;
  channelMessagesExist: boolean = true;
  users: User[] = [];
  channels: Channel[] = [];
  selectedChannelId: string | null = null;
  selectedUserId: string | null = null;
  showChannels: boolean = false;
  showUsers: boolean = false;

  private firestore = inject(Firestore);

  messageForm = new FormGroup({
    message: new FormControl('', [Validators.required]),
  });

  ngOnInit(): void {
    this.loadChannels();
    this.loadUsers();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedUser'] && this.selectedUser) {
      this.checkChatExists();
    } else if (changes['selectedChannel'] && this.selectedChannel) {
      this.checkChannelMessagesExist();
    }
  }

  async loadChannels() {
    const channelsRef = collection(this.firestore, 'channels');
    const snapshot = await getDocs(channelsRef);

    this.channels = snapshot.docs.map(doc => {
      const data = doc.data();
      return new Channel({ ...data, channelId: doc.id });
    });
  }

  async loadUsers() {
    const usersRef = collection(this.firestore, 'users');
    const snapshot = await getDocs(usersRef);

    this.users = snapshot.docs.map(doc => {
      const data = doc.data();
      return { ...data, id: doc.id } as User;
    });
  }

  checkChatExists() {
    const sortedIds = [this.shared.actualUser.uid, this.selectedUser?.id].sort();
    const chatId = sortedIds.join('_');
    const directMessages = collection(this.firestore, "directMessages");
    const q = query(directMessages, where('chatId', '==', chatId));
    onSnapshot(q, (querySnapshot) => {
      this.chatExists = !querySnapshot.empty;
    });
  }

  async checkChannelMessagesExist() {
    const selectedId = this.selectedChannel?.channelId ?? '';
    const chatDocRef = doc(this.firestore, 'channels', selectedId);
    const messagesRef = collection(chatDocRef, 'messages');
    const snapshot = await getDocs(messagesRef);
    this.channelMessagesExist = !snapshot.empty;
  }

  async onSubmit() {
    const message = this.messageForm.value.message?.trim();
    if (!message) return;

    if (this.selectedUser) {
      await this.pushDirectChatMessages();
    } else if (this.selectedChannel) {
      await this.pushChannelMessages();
    }
  }

  async pushDirectChatMessages() {
    const sortedIds = [this.shared.actualUser.uid, this.selectedUser?.id].sort();
    const chatId = sortedIds.join('_');
    const messageText = this.messageForm.value.message ?? '';

    const chatDocRef = doc(this.firestore, 'directMessages', chatId);
    if (!this.chatExists) {
      await setDoc(chatDocRef, { chatId });
    }

    const messagesRef = collection(this.firestore, 'directMessages', chatId, 'messages');
    await addDoc(messagesRef, {
      user: this.shared.actualUser.uid,
      text: messageText,
      timeStamp: serverTimestamp()
    });

    this.messageForm.reset();
  }

  async pushChannelMessages() {
    const messageText = this.messageForm.value.message ?? '';
    const selectedId = this.selectedChannel?.channelId ?? '';

    const messagesRef = collection(this.firestore, 'channels', selectedId, 'messages');
    await addDoc(messagesRef, {
      user: this.shared.actualUser.uid,
      text: messageText,
      timeStamp: serverTimestamp()
    });

    this.messageForm.reset();
  }

  toggleChannelsOverlay() {
    this.showChannels = !this.showChannels;
    this.showUsers = false;
  }

  toggleUsersOverlay() {
    this.showUsers = !this.showUsers;
    this.showChannels = false;
  }

  onSelectChannel(channel: Channel) {
    this.selectedChannel = channel;
    this.selectedUser = null;
    this.selectedChannelId = channel.channelId;
    this.showChannels = false;
  }

  onSelectUser(user: User) {
    this.selectedUser = user;
    this.selectedChannel = null;
    this.selectedUserId = user.id ?? null;
    this.showUsers = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const clickedInsideOverlay = target.closest('.list-overlay');
    const clickedAtButton = target.closest('.at');

    if (!clickedInsideOverlay && !clickedAtButton) {
      this.showChannels = false;
    }
  }
}
