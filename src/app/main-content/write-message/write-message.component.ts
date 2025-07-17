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
  private channelSub?: Subscription;
  private savedRange: Range | null = null;

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
    if (this.editor?.nativeElement) {
      this.editor.nativeElement.innerText = '';
    }
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
    let cleanedMessage = this.removeMentionsFromDOM();
    if (!cleanedMessage) return;

    if (this.mode === 'thread') {
      this.pushAnswerMessageChannel();
    } else {
      if (this.selectedUser) {
        await this.pushDirectChatMessages(cleanedMessage);
      } else if (this.selectedChannel) {
        await this.pushChannelMessages(cleanedMessage);
      }
    }

    this.editor.nativeElement.innerHTML = '';
  }

  private removeMentionsFromDOM(): string {
    const editorDiv = this.editor.nativeElement;
    const mentionElements = editorDiv.querySelectorAll('.mention');

    mentionElements.forEach(el => {
      el.remove();
    });

    return editorDiv.innerText.trim();
  }

  async pushDirectChatMessages(cleanedMessage: string) {
    const sortedIds = [this.shared.actualUser.uid, this.selectedUser?.id].sort();
    const chatId = sortedIds.join('_');

    const chatDocRef = doc(this.firestore, 'directMessages', chatId);
    if (!this.chatExists) await setDoc(chatDocRef, { chatId });

    const messagesRef = collection(this.firestore, 'directMessages', chatId, 'messages');
    await addDoc(messagesRef, {
      user: this.shared.actualUser.uid,
      text: cleanedMessage,
      timeStamp: serverTimestamp(),
      channelId: chatId
    });

    this.messageForm.reset();
  }

  async pushChannelMessages(cleanedMessage: string) {
    const selectedId = this.selectedChannel?.channelId ?? '';
    const messagesRef = collection(this.firestore, 'channels', selectedId, 'messages');
    await addDoc(messagesRef, {
      user: this.shared.actualUser.uid,
      text: cleanedMessage,
      timeStamp: serverTimestamp(),
      channelId: selectedId
    });

    this.messageForm.reset();
  }

  toggleChannelsOverlay() {
    if (!this.showChannels) {
      this.showChannels = !this.showChannels;
      this.showUsers = false;
    } else if (this.showChannels) {
      this.showChannels = false;
      this.showUsers = !this.showUsers;
    }
  }

  insertMention(text: string) {
    const div = this.editor.nativeElement;
    div.focus();

    this.ensureCursorPosition();

    const range = this.savedRange!.cloneRange();
    const span = this.createMentionSpan(text);
    const space = document.createTextNode('\u00A0');

    range.deleteContents();
    range.insertNode(span);
    span.parentNode?.insertBefore(space, span.nextSibling);

    range.setStartAfter(space);
    range.collapse(true);

    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    this.saveCursorPosition();
    this.syncEditorToForm();
  }

  private ensureCursorPosition() {
    if (this.savedRange) return;

    const div = this.editor.nativeElement;
    const selection = window.getSelection();
    const range = document.createRange();

    if (div.childNodes.length > 0) {
      range.selectNodeContents(div);
      range.collapse(false);
    } else {
      const textNode = document.createTextNode('');
      div.appendChild(textNode);
      range.setStart(textNode, 0);
      range.collapse(true);
    }

    selection?.removeAllRanges();
    selection?.addRange(range);
    this.savedRange = range;
  }

  private createMentionSpan(text: string): HTMLElement {
    const span = document.createElement('span');
    span.className = 'mention';
    span.textContent = text;
    span.contentEditable = 'false';
    return span;
  }

  onContentInput() {
    const html = this.editor.nativeElement.innerText;
    this.messageForm.controls['message'].setValue(html);
  }

  onEditorKeyDown(event: KeyboardEvent) {
    if (event.key === 'Backspace') {
      const sel = window.getSelection()!;
      const node = sel.anchorNode as HTMLElement;
      if (node && node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).classList.contains('mention')) {
        (node as HTMLElement).remove();
        event.preventDefault();
        this.syncEditorToForm();
      }
    }
  }

  syncEditorToForm() {
    if (!this.editor) return;
    const div = this.editor.nativeElement;
    let content = div.innerText.trim();

    content = content.replace(/[@#][^@\s]+/g, '').replace(/\s{2,}/g, ' ').trim();

    this.messageForm.controls['message'].setValue(content);
  }

  onSelectChannel(channel: Channel) {
    this.selectedChannel = channel;
    this.selectedUser = null;
    this.selectedChannelId = channel.channelId;
    this.showChannels = false;
    this.sharedMessages.setSelectedChannel(channel);

    setTimeout(() => {
      if (this.editor?.nativeElement) {
        this.insertMention(`#${channel.channelName.slice(1)}`);
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
        this.insertMention(`@${fullName}`);
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
      this.restoreCursorPosition();
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
    div.focus();

    this.ensureCursorPosition();

    const range = this.savedRange!.cloneRange();
    const emojiNode = document.createTextNode(emoji);
    range.insertNode(emojiNode);

    range.setStartAfter(emojiNode);
    range.collapse(true);

    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    this.saveCursorPosition();
    this.syncEditorToForm();
    this.closeEmojiOverlay();
  }

  private closeEmojiOverlay() {
    this.emojiOverlay = false;
    this.emojiThreadOverlay = false;
  }

  saveCursorPosition() {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      this.savedRange = selection.getRangeAt(0);
    }
  }

  restoreCursorPosition() {
    const selection = window.getSelection();
    if (this.savedRange && selection) {
      selection.removeAllRanges();
      selection.addRange(this.savedRange.cloneRange());
    }
  }
}