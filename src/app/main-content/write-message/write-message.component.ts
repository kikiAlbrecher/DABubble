import {
  Component, ViewChild, OnInit, ElementRef, HostListener, Input, Output, EventEmitter, inject, OnChanges,
  SimpleChanges, AfterViewInit
} from '@angular/core';
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
import { MentionComponent } from '../../search/mention/mention.component';
import { MentionUtilsService } from '../../search/mention-utils.service';

@Component({
  selector: 'app-write-message',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CommonModule,
    ChannelsComponent,
    UsersComponent,
    PickerComponent,
    MentionComponent
  ],
  templateUrl: './write-message.component.html',
  styleUrl: './write-message.component.scss'
})
export class WriteMessageComponent implements OnInit, OnChanges, AfterViewInit {

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
  @ViewChild('editor', { static: false }) editor!: ElementRef<HTMLDivElement>;
  @ViewChild(MentionComponent) mentionComponent?: MentionComponent;

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
  messageText: any = "";
  toggleMention: '@' | '#' = '@';

  private firestore = inject(Firestore);
  private channelShared = inject(ChannelSharedService);
  private userSub?: Subscription;
  private channelSub?: Subscription;
  public editorNativeElement?: HTMLElement;

  messageForm = new FormGroup({
    message: new FormControl('', [Validators.required]),
  });

  ngOnInit(): void {
    this.takeInChannels();
    this.takeInUsers();

    if (this.editor?.nativeElement) {
      this.editor.nativeElement.innerText = '';
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      if (this.editor?.nativeElement) {
        this.editorNativeElement = this.editor.nativeElement;
        this.editor.nativeElement.innerText = '';
      }
    });
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

  onMentionSelected(name: string): void {
    this.mentionComponent?.insertMention(name);

    if (this.editor) {
      MentionUtilsService.syncEditorToForm(
        this.editor.nativeElement,
        this.messageForm.controls['message']
      );
    }

    if (name.startsWith('@')) {
      this.autocompleteUserName(name.slice(1).toLowerCase());
    } else if (name.startsWith('#')) {
      this.autocompleteChannelName(name.slice(1).toLowerCase());
    }
  }

  private autocompleteUserName(username: string): void {
    const user = this.users.find(u =>
      (u.displayName || u.name).toLowerCase() === username
    );
    if (!user) return;

    this.selectedUser = user;
    this.selectedChannel = null;
    this.selectUser.emit(user);
  }

  private autocompleteChannelName(channelName: string): void {
    const channel = this.channels.find(c =>
      c.channelName.replace(/^#/, '').toLowerCase() === channelName
    );
    if (!channel) return;

    this.selectedChannel = channel;
    this.selectedUser = null;
    this.selectChannel.emit(channel);
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

  private extractMentions(): { users: User[], channels: Channel[] } {
    const mentions = this.editor.nativeElement.querySelectorAll('.mention');
    const mentionedUsers: User[] = [];
    const mentionedChannels: Channel[] = [];

    mentions.forEach((mention) => {
      const text = mention.textContent ?? '';

      if (text.startsWith('@')) {
        const name = text.slice(1).toLowerCase();
        const user = this.users.find(u =>
          (u.displayName || u.name).toLowerCase() === name
        );
        if (user && !mentionedUsers.some(u => u.id === user.id)) {
          mentionedUsers.push(user);
        }
      }

      if (text.startsWith('#')) {
        const normalizedMention = text.slice(1).toLowerCase();
        const channel = this.channels.find(chan =>
          chan.channelName.replace(/^#/, '').toLowerCase() === normalizedMention
        );
        if (channel && !mentionedChannels.some(c => c.channelId === channel.channelId)) {
          mentionedChannels.push(channel);
        }
      }
    });

    return { users: mentionedUsers, channels: mentionedChannels };
  }

  async onSubmit() {
    const { users, channels } = this.extractMentions();
    let cleanedMessage = this.removeMentionsFromDOM();
    if (!cleanedMessage) return;

    if (users.length === 0 && channels.length === 0) {
      if (this.mode === 'thread') {
        await this.pushAnswerMessageChannel();
      } else {
        if (this.selectedUser) {
          await this.pushDirectChatMessages(cleanedMessage, this.selectedUser);
        } else if (this.selectedChannel) {
          await this.pushChannelMessages(cleanedMessage, this.selectedChannel);
        }
      }
    } else {
      for (const user of users) {
        await this.pushDirectChatMessages(cleanedMessage, user);
      }
      for (const channel of channels) {
        await this.pushChannelMessages(cleanedMessage, channel);
      }
    }

    this.editor.nativeElement.innerHTML = '';
  }

  private removeMentionsFromDOM(): string {
    return MentionUtilsService.removeMentionsFromElement(this.editor.nativeElement);
  }

  async pushDirectChatMessages(cleanedMessage: string, user: User) {
    const sortedIds = [this.shared.actualUser.uid, user.id].sort();
    const chatId = sortedIds.join('_');

    const chatDocRef = doc(this.firestore, 'directMessages', chatId);
    const directMessages = collection(this.firestore, 'directMessages');
    const q = query(directMessages, where('chatId', '==', chatId));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      await setDoc(chatDocRef, { chatId });
    }

    const messagesRef = collection(this.firestore, 'directMessages', chatId, 'messages');
    await addDoc(messagesRef, {
      user: this.shared.actualUser.uid,
      text: cleanedMessage,
      timeStamp: serverTimestamp(),
      channelId: chatId
    });

    this.messageForm.reset();
  }

  async pushChannelMessages(cleanedMessage: string, channel: Channel) {
    const messagesRef = collection(this.firestore, 'channels', channel.channelId, 'messages');

    await addDoc(messagesRef, {
      user: this.shared.actualUser.uid,
      text: cleanedMessage,
      timeStamp: serverTimestamp(),
      channelId: channel.channelId
    });

    this.messageForm.reset();
  }

  toggleMentionOverlay() {
    this.toggleMention = this.toggleMention === '@' ? '#' : '@';

    this.mentionComponent?.mentionService.trigger$.next(this.toggleMention);
    this.mentionComponent?.mentionService.query$.next('');
    this.mentionComponent?.mentionService.showOverlay$.next(true);
  }

  onEditorClick() {
    this.mentionComponent?.mentionService.reset();
  }

  onContentInput() {
    const sel = window.getSelection();
    const pre = MentionUtilsService.getTextBeforeCursor(this.editor.nativeElement, sel);
    const match = pre.match(/(?:^|\s)([@#])(\w*)$/);

    if (match) {
      this.mentionComponent?.mentionService.trigger$.next(match[1] as '@' | '#');
      this.mentionComponent?.mentionService.query$.next(match[2]);
      this.mentionComponent?.mentionService.showOverlay$.next(true);
    } else {
      this.mentionComponent?.mentionService.reset();
    }

    MentionUtilsService.syncEditorToForm(this.editor.nativeElement, this.messageForm.controls['message']);
  }

  onEditorKeyDown(event: KeyboardEvent) {
    MentionUtilsService.handleEditorKeyDown(event, this.editor.nativeElement, this.messageForm.controls['message']);
  }

  onSelectChannel(channel: Channel) {
    this.selectedChannel = channel;
    this.selectedUser = null;
    this.selectedChannelId = channel.channelId;
    this.showChannels = false;
    this.sharedMessages.setSelectedChannel(channel);

    setTimeout(() => {
      if (this.editor?.nativeElement) {
        this.mentionComponent?.insertMention(`#${channel.channelName.slice(1)}`);
      }
    }, 0);
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

    const fullName = user.displayName || user.name;
    setTimeout(() => {
      if (this.editor?.nativeElement) {
        this.mentionComponent?.insertMention(`@${fullName}`);
      }
    }, 0);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const clickedInsideOverlay = target.closest('.list-overlay');
    const clickedAtButton = target.closest('.at');
    const clickedEmojiButton = target.closest('.smiley');
    const clickedEmojiOverlay = target.closest('.emoji-picker-container');

    if (!clickedInsideOverlay && !clickedAtButton && !clickedEmojiButton && !clickedEmojiOverlay) {
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

  public focusInput() {
    setTimeout(() => {
      this.editor?.nativeElement.focus();
      this.mentionComponent?.restoreCursorPosition();
    });
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
    const div = this.editor.nativeElement;

    this.mentionComponent?.restoreCursorPosition();

    const range = window.getSelection()?.getRangeAt(0).cloneRange();
    if (!range) return;

    const emojiNode = document.createTextNode(emoji);
    range.insertNode(emojiNode);

    range.setStartAfter(emojiNode);
    range.collapse(true);

    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    this.mentionComponent?.saveCursorPosition();
    MentionUtilsService.syncEditorToForm(this.editor.nativeElement, this.messageForm.controls['message']);
    this.closeEmojiOverlay();
  }

  private closeEmojiOverlay() {
    this.emojiOverlay = false;
    this.emojiThreadOverlay = false;
  }
}