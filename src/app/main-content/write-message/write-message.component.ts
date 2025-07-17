import { Component, ViewChild, OnInit, ElementRef, HostListener, Input, Output, EventEmitter, inject, OnChanges, SimpleChanges } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Firestore, serverTimestamp, collection, getDocs, setDoc, addDoc, query, where, onSnapshot } from '@angular/fire/firestore';
import { doc } from 'firebase/firestore';
import { User } from '../../userManagement/user.interface';
import { Channel } from '../../../models/channel.class';
import { UserSharedService } from '../../userManagement/userManagement-service';
import { ChannelsComponent } from '../../style-components/channels/channels.component';
import { UsersComponent } from "../../style-components/users/users.component";
import { MessageSharedService } from '../message-service';
import { PickerComponent } from '@ctrl/ngx-emoji-mart';
import { Subscription } from 'rxjs';
import { ChannelSharedService } from '../../channel-management/channel-shared.service';

@Component({
  selector: 'app-write-message',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CommonModule,
    ChannelsComponent,
    UsersComponent,
    PickerComponent
  ],
  templateUrl: './write-message.component.html',
  styleUrl: './write-message.component.scss'
})
export class WriteMessageComponent implements OnInit, OnChanges {

  constructor(
    public shared: UserSharedService,
    public sharedMessages: MessageSharedService,
    private eRef: ElementRef
  ) { }

  @Input() user!: User;
  @Input() selectedUser: User | null = null;
  @Input() selectedChannel: Channel | null = null;
  @Input() mode: 'default' | 'thread' = 'default';
  @Output() selectUser = new EventEmitter<User>();
  @Output() selectChannel = new EventEmitter<Channel>();
  @ViewChild('input', { static: false }) input!: ElementRef<HTMLTextAreaElement>;

  textError: boolean = false;
  chatExists: boolean = true;
  channelMessagesExist: boolean = true;
  users: User[] = [];
  channels: Channel[] = [];
  selectedChannelId: string | null = null;
  selectedUserId: string | null = null;
  showChannels: boolean = false;
  showUsers: boolean = false;
  placeHolderText: string = "";
  emojiOverlay: boolean = false;
  emojiThreadOverlay: boolean = false;
  messageText: any = ""

  private firestore = inject(Firestore);
  private channelShared = inject(ChannelSharedService);
  private userSub?: Subscription;
  // private unsubscribeChannels?: () => void;
  private channelSub?: Subscription;

  messageForm = new FormGroup({
    message: new FormControl('', [Validators.required]),
  });

  ngOnInit(): void {
    this.takeInChannels();
    this.takeInUsers();
  }

  takeInChannels() {
    this.channelShared.subscribeValidChannels();

    this.channelSub = this.channelShared.allValidChannels$.subscribe(channels => {
      this.channels = channels;
    });
  }

  takeInUsers() {
    this.shared.subscribeValidUsers();

    this.userSub = this.shared.allValidUsers$.subscribe(users => {
      this.users = users;
    });
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
    this.channelSub?.unsubscribe();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedUser'] && this.selectedUser) {
      this.checkChatExists();
    } else if (changes['selectedChannel'] && this.selectedChannel) {
      this.checkChannelMessagesExist();
    }
    this.putPlaceHolderText();
  }

  // async loadChannels() {
  //   const channelsRef = collection(this.firestore, 'channels');
  //   const snapshot = await getDocs(channelsRef);
  //   this.channels = snapshot.docs.map(doc => {
  //     const data = doc.data();
  //     return new Channel({ ...data, channelId: doc.id });
  //   });
  // }

  // async loadUsers() {
  //   const usersRef = collection(this.firestore, 'users');
  //   const snapshot = await getDocs(usersRef);
  //   this.users = snapshot.docs.map(doc => {
  //     const data = doc.data();
  //     return { ...data, id: doc.id } as User;
  //   });
  // }

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
    if (this.mode === 'thread') {
      this.pushAnswerMessageChannel();
    } else {
      if (this.selectedUser) {
        await this.pushDirectChatMessages();
      } else if (this.selectedChannel) {
        await this.pushChannelMessages();
      }
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
      timeStamp: serverTimestamp(),
      channelId: chatId
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
      timeStamp: serverTimestamp(),
      channelId: selectedId
    });
    this.messageForm.reset();
  }

  // listenToChannels() {
  //   const channelsRef = collection(this.firestore, 'channels');
  //   this.unsubscribeChannels = onSnapshot(channelsRef, snapshot => {
  //     this.channels = snapshot.docs.map(doc => doc.data() as Channel);
  //     if (this.channels.length > 0 && !this.selectedChannelId) {
  //       const defaultChannel = this.channels[0];
  //       this.selectedChannelId = defaultChannel.channelId;
  //       this.selectChannel.emit(defaultChannel);
  //     }
  //   });
  // }

  toggleChannelsOverlay() {
    if (!this.showChannels) {
      this.showChannels = !this.showChannels;
      // this.listenToChannels();
      this.showUsers = false;
    } else if (this.showChannels) {
      this.showChannels = false;
      this.showUsers = !this.showUsers;
    }
  }

  onSelectChannel(channel: Channel) {
    this.selectedChannel = channel;
    this.selectedUser = null;
    this.selectedChannelId = channel.channelId;
    this.showChannels = false;
    this.sharedMessages.setSelectedChannel(channel);
  }

  @HostListener('document:click', ['$event'])
  handleClickOutside(event: MouseEvent) {
    if (this.showChannels && !this.eRef.nativeElement.contains(event.target)) {
      this.showChannels = false;
    }
  }

  onSelectUser(user: User) {
    this.selectedUser = user;
    this.selectedChannel = null;
    this.selectedUserId = user.id ?? null;
    this.showUsers = false;
    this.sharedMessages.setSelectedUser(user);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const clickedInsideOverlay = target.closest('.list-overlay');
    const clickedAtButton = target.closest('.at');
    const clickedEmojiButton = target.closest('.smiley');
    const clickedEmojiOverlay = target.closest('.emoji-picker-container');
    if (
      !clickedInsideOverlay &&
      !clickedAtButton &&
      !clickedEmojiButton &&
      !clickedEmojiOverlay
    ) {
      this.showChannels = false;
      this.emojiOverlay = false;
      this.emojiThreadOverlay = false;
    }
  }

  putPlaceHolderText() {
    if (this.mode === 'thread') {
      this.placeHolderText = 'Antworten...';
    } else {
      if (this.sharedMessages.selectedUser?.id == this.shared.actualUserID) {
        this.placeHolderText = 'Nachricht an dich selbst';
      } else {
        this.placeHolderText = this.selectedChannel ? 'Nachricht an ' + this.selectedChannel.channelName : 'Nachricht an ' + this.selectedUser?.name
      }
      
    }
  }

  async pushAnswerMessageChannel() {
    const messageText = this.messageForm.value.message ?? '';
    const messageId = this.sharedMessages.selectedMessage?.id ?? '';
    const channelId = this.sharedMessages.selectedMessage?.channelId ?? "";
    if (this.sharedMessages.channelSelected) {
      const answerRef = collection(this.firestore, 'channels', channelId, 'messages', messageId, 'answers');
      await addDoc(answerRef, {
        user: this.shared.actualUser.uid,
        text: messageText,
        timeStamp: serverTimestamp()
      });
    } else if (this.sharedMessages.userSelected) {
      const answerRef = collection(this.firestore, 'directMessages', channelId, 'messages', messageId, 'answers');
      await addDoc(answerRef, {
        user: this.shared.actualUser.uid,
        text: messageText,
        timeStamp: serverTimestamp()
      });
    }
    this.messageForm.reset();
  }

  toggleEmojiOverlay() {
    if (this.mode === 'thread') {
      this.emojiThreadOverlay = !this.emojiThreadOverlay
    } else {
      this.emojiOverlay = !this.emojiOverlay
    }
  }

  addEmoji(selected: any) {
    const emoji: string = selected.emoji.native;
    const input = this.input.nativeElement;
    input.focus();
    const [start, end] = [input.selectionStart, input.selectionEnd];
    input.setRangeText(emoji, start, end, 'end');
    this.messageForm.controls['message'].setValue(input.value);
    this.emojiOverlay = false;
    this.emojiThreadOverlay = false
  }
}