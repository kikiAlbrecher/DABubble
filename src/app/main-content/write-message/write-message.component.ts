/**
 * 
 */

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
import { DevspaceService } from '../devspace/devspace.service';
import { MentionHandlerService } from '../../search/mention-handler.service';

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
    private eRef: ElementRef,
    private devspaceService: DevspaceService
  ) { }

  @Input() user!: User;
  @Input() selectedUser: User | null = null;
  @Input() selectedChannel: Channel | null = null;
  @Input() mode: 'default' | 'thread' = 'default';
  @Input() devspaceOpen: boolean = false;
  @Output() selectUser = new EventEmitter<User>();
  @Output() selectChannel = new EventEmitter<Channel>();
  @Output() searchMail = new EventEmitter<{ success: boolean; message: string }>();
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
  messageForm = new FormGroup({
    message: new FormControl('', [Validators.required]),
  });

  private firestore = inject(Firestore);
  private channelShared = inject(ChannelSharedService);
  private mentionHandler = inject(MentionHandlerService);
  private userSub?: Subscription;
  private channelSub?: Subscription;
  public editorNativeElement?: HTMLElement;
  private devspaceMentions: string[] = [];

  /**
  * Lifecycle hook that is called after Angular has initialized the component.
  * 
  * - Loads all available channels and users.
  * - Clears the content of the `editor` element if it exists.
  */
  ngOnInit(): void {
    this.takeInChannels();
    this.takeInUsers();

    if (this.editor?.nativeElement) {
      this.editor.nativeElement.innerHTML = '';
    }
  }

  /**
   * Lifecycle hook called after the component's view has been fully initialized.
   * 
   * - Delays execution using `setTimeout` to ensure view is stable.
   * - Initializes `editorNativeElement` with the reference to the editor DOM element.
   * - Clears the editor content.
   */  
  ngAfterViewInit(): void {
    setTimeout(() => {
      if (this.editor?.nativeElement) {
        this.editorNativeElement = this.editor.nativeElement;
        this.editor.nativeElement.innerHTML = '';
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

/**
 * Lifecycle hook that is called when the component is about to be destroyed.
 * 
 * - Cleans up active subscriptions to prevent memory leaks.
 */  
  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
    this.channelSub?.unsubscribe();
  }

  /**
   * Lifecycle hook that is called whenever input-bound properties change.
   * 
   * @param changes - An object of type `SimpleChanges` that holds the changed input properties.
   * 
   * - Checks if a new user or channel has been selected and triggers corresponding data loading.
   * - Updates placeholder text accordingly.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedUser'] && this.selectedUser) {
      this.checkChatExists();
    } else if (changes['selectedChannel'] && this.selectedChannel) {
      this.checkChannelMessagesExist();
    }
    this.putPlaceHolderText();
  }

  onMentionSelected(name: string): void {
    this.mentionHandler.handleMentionSelected(
      name,
      this.users,
      this.channels,
      mention => this.mentionComponent?.insertMention(mention),
      user => {
        this.selectedUser = user;
        this.selectedChannel = null;
        this.selectUser.emit(user);
      },
      channel => {
        this.selectedChannel = channel;
        this.selectedUser = null;
        this.selectChannel.emit(channel);
      },
      () => {
        if (this.editor) {
          MentionUtilsService.syncEditorToForm(this.editor.nativeElement, this.messageForm.controls['message']);
        }
      }
    );
  }

  /**
  * Checks whether a direct chat already exists between the current user and the selected user.
  * 
  * This method generates a unique `chatId` by sorting and joining the current user's UID
  * and the selected user's ID. It then queries the Firestore `directMessages` collection
  * to check if a chat document with that `chatId` already exists.
  * 
  * If such a document is found, `chatExists` is set to `true`; otherwise, it is set to `false`.
  * 
  * Uses Firestore's real-time listener (`onSnapshot`) to keep `chatExists` updated
  * if the underlying data changes.
  */
  checkChatExists() {
    const sortedIds = [this.shared.actualUser.uid, this.selectedUser?.id].sort();
    const chatId = sortedIds.join('_');
    const directMessages = collection(this.firestore, "directMessages");
    const q = query(directMessages, where('chatId', '==', chatId));
    onSnapshot(q, (querySnapshot) => {
      this.chatExists = !querySnapshot.empty;
    });
  }

  /**
   * Asynchronously checks whether messages exist in the currently selected channel.
   *
   * This method retrieves the `channelId` from the selected channel and references
   * the corresponding `messages` subcollection in Firestore.
   * 
   * It then fetches all documents from that subcollection using `getDocs`. If the snapshot
   * is not empty, it sets `channelMessagesExist` to `true`; otherwise, it is set to `false`.
   *
   * This check helps determine whether a channel already contains messages.
   */  
  async checkChannelMessagesExist() {
    const selectedId = this.selectedChannel?.channelId ?? '';
    const chatDocRef = doc(this.firestore, 'channels', selectedId);
    const messagesRef = collection(chatDocRef, 'messages');
    const snapshot = await getDocs(messagesRef);
    this.channelMessagesExist = !snapshot.empty;
  }

  async handleDevspaceEntry(): Promise<boolean> {
    const input = this.devspaceService.getEditorTextContent();
    if (!input) return false;

    const mentions: string[] = [];

    try {
    mentions.push(...await MentionUtilsService.findEmails(input, this.firestore));
    } catch (error: any) {
    this.searchMail.emit({ success: false, message: 'Es gibt keinen registrierten User mit dieser E-Mail-Adresse.' });
      return false;
    }

    mentions.push(...await MentionUtilsService.findEmails(input, this.firestore));
    mentions.push(...MentionUtilsService.findUserMentions(input, this.users));
    mentions.push(...MentionUtilsService.findChannelMentions(input, this.channels));

    this.devspaceMentions = mentions;

    this.devspaceService.clearEditor();
    return mentions.length > 0;
  }

  async onSubmit() {
    if (this.devspaceOpen) {
      await this.handleDevspaceEntry();
    }

    const message = this.removeMentionsFromDOM();
    if (!message) return;

    const { mentionedUsers, mentionedChannels } = this.getMentionedEntities();
    await this.sendMessages(message, mentionedUsers, mentionedChannels);

    this.clearAfterSend();
  }

  private getMentionedEntities() {
    const users = this.devspaceMentions
      .filter(m => m.startsWith('@'))
      .map(m => m.substring(1).toLowerCase());
    const channels = this.devspaceMentions
      .filter(m => m.startsWith('#'))
      .map(m => m.substring(1).toLowerCase());

    const mentionedUsers = this.users.filter(u =>
      users.includes((u.displayName || u.name).toLowerCase())
    );
    const mentionedChannels = this.channels.filter(c =>
      channels.includes(c.channelName.toLowerCase())
    );

    return { mentionedUsers, mentionedChannels };
  }

  /**
   * Sends a message either as a default message or to specific users and channels.
   *
   * This method checks whether there are any users or channels mentioned.
   * - If no users or channels are provided, it sends the message using `sendDefaultMessage()`.
   * - If users are provided, it sends a direct message to each user using `pushDirectChatMessages()`.
   * - If channels are provided, it sends the message to each channel using `pushChannelMessages()`.
   *
   * @param message - The message content to be sent.
   * @param users - An array of `User` objects representing the recipients for direct messages.
   * @param channels - An array of `Channel` objects representing the target channels.
   *
   * @returns A `Promise` that resolves once all messages have been sent.
   */
  private async sendMessages(message: string, users: User[], channels: Channel[]) {
    if (users.length === 0 && channels.length === 0) {
      await this.sendDefaultMessage(message);
    } else {
      for (const user of users) {
        await this.pushDirectChatMessages(message, user);
      }
      for (const channel of channels) {
        await this.pushChannelMessages(message, channel);
      }
    }
  }

  /**
   * Sends a default message based on the current messaging context.
   *
   * This function checks the current mode and context (thread, selected user, or selected channel)
   * and routes the message accordingly:
   * - If the mode is `'thread'`, it calls `pushAnswerMessageChannel()` to reply within a thread.
   * - If a user is selected, it sends a direct message to that user using `pushDirectChatMessages()`.
   * - If a channel is selected, it sends a message to the selected channel using `pushChannelMessages()`.
   *
   * @param message - The message content to be sent.
   *
   * @returns A `Promise` that resolves after the appropriate message has been dispatched.
   */
  private async sendDefaultMessage(message: string) {
    if (this.mode === 'thread') {
      await this.pushAnswerMessageChannel();
    } else if (this.selectedUser) {
      await this.pushDirectChatMessages(message, this.selectedUser);
    } else if (this.selectedChannel) {
      await this.pushChannelMessages(message, this.selectedChannel);
    }
  }

  /**
   * Clears the message editor and resets the mention list after a message is sent.
   *
   * This method:
   * - Empties the HTML content of the editor.
   * - Clears the list of collected mentions (`devspaceMentions`).
   */
  private clearAfterSend() {
    this.editor.nativeElement.innerHTML = '';
    this.devspaceMentions = [];
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

  /**
   * Sends a message to a specific channel by adding it to the channel's messages collection in Firestore.
   *
   * @param cleanedMessage - The message text to send, typically sanitized or processed.
   * @param channel - The channel object to which the message should be sent.
   *
   * @returns A Promise that resolves once the message has been successfully added to Firestore.
   *
   * This method:
   * - Gets a reference to the 'messages' sub-collection of the specified channel.
   * - Adds a new document with the message text, the current user's ID, a timestamp, and the channel ID.
   * - Resets the message form after sending.
   */
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

  /**
   * Handles the selection of a channel.
   * - Sets the selected channel and clears the selected user.
   * - Updates the selectedChannelId and hides the channel list.
   * - Notifies the shared message service about the selected channel.
   * - Inserts a mention of the channel name (without the first character) into the editor.
   *
   * @param channel - The channel object selected by the user.
   */
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

  /**
   * Listens for click events on the entire document.
   * - Closes the channel list dropdown if the user clicks outside the component element.
   *
   * @param event - The mouse click event.
   */
  @HostListener('document:click', ['$event'])
  handleClickOutside(event: MouseEvent) {
    if (this.showChannels && !this.eRef.nativeElement.contains(event.target)) {
      this.showChannels = false;
    }
  }

  /**
   * Handles the selection of a user.
   * - Sets the selected user and clears the selected channel.
   * - Updates the selectedUserId and hides the user list.
   * - Notifies the shared message service about the selected user.
   * - Inserts a mention of the user’s display name or name into the editor.
   *
   * @param user - The user object selected by the user.
   */
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

  /**
   * Listens for click events on the entire document.
   * Closes various UI overlays (channel list, emoji pickers) if the click happens outside
   * of specific elements related to these overlays.
   * 
   * Specifically, it checks if the click target or its ancestors have any of the following CSS classes:
   * - 'list-overlay' (channel/user list overlay)
   * - 'at' (the "@" mention button)
   * - 'smiley' (emoji button)
   * - 'emoji-picker-container' (emoji picker overlay)
   * 
   * If the click occurred outside all of these elements, it hides the channel list and emoji overlays.
   * 
   * @param event - The MouseEvent triggered by the click.
   */
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

  /**
   * Sets the placeholder text for the message input field based on the current mode and selected user or channel.
   *
   * - If the mode is 'thread', the placeholder is set to "Antworten..." (i.e., "Reply...").
   * - Otherwise, if the selected user is the current user, the placeholder indicates "Message to yourself".
   * - If a channel is selected, the placeholder shows "Message to [channel name]".
   * - If a user is selected (and it is not the current user), the placeholder shows "Message to [user name]".
   */
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

  /**
   * Sets the keyboard focus to the message input editor and restores the cursor position for mentions.
   * 
   * Uses a `setTimeout` to ensure the focus action happens after the current call stack,
   * which helps avoid timing issues with the DOM rendering.
   */
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

  /**
   * Toggles the visibility of the emoji overlay based on the current mode.
   * 
   * - If the mode is 'thread', toggles the emoji overlay for thread replies (`emojiThreadOverlay`).
   * - Otherwise, toggles the general emoji overlay (`emojiOverlay`).
   * 
   * This function switches the overlay's state between visible and hidden.
   */
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