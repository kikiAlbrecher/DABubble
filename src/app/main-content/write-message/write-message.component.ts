import {
  Component, ViewChild, OnInit, ElementRef, HostListener, Input, Output, EventEmitter, inject, OnChanges,
  SimpleChanges, AfterViewInit
} from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Firestore, serverTimestamp, collection, getDocs, setDoc, addDoc, query, where } from '@angular/fire/firestore';
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
import { WriteMessageService } from './write-message.service';
import { WriteMessageEmojiService } from './write-message-emoji.service';
import { MentionSelectionService } from '../../search/mention-selection.service';

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
    public devspaceService: DevspaceService,
    private writeMessages: WriteMessageService,
    private writeEmoji: WriteMessageEmojiService,
    private mentionSelectionService: MentionSelectionService
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
  mentionedUsers: User[] = [];
  mentionedChannels: Channel[] = [];
  messageForm = new FormGroup({
    message: new FormControl('', [Validators.required]),
  });

  firestore = inject(Firestore);
  private channelShared = inject(ChannelSharedService);
  private mentionHandler = inject(MentionHandlerService);
  private userSub?: Subscription;
  private channelSub?: Subscription;
  public editorNativeElement?: HTMLElement;
  public devspaceMentions: string[] = [];

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
    setTimeout(() => this.editor.nativeElement.focus(), 0);
  }

  /**
   * Lifecycle hook that initializes the editor element after the view is initialized.
   */
  ngAfterViewInit(): void {
    setTimeout(() => {
      if (this.editor?.nativeElement) {
        this.editorNativeElement = this.editor.nativeElement;
        this.editor.nativeElement.innerHTML = '';
      }
    });
  }

  /**
   * Subscribes to the observable stream of valid channels.
   */
  takeInChannels() {
    this.channelShared.subscribeValidChannels();

    this.channelSub = this.channelShared.allValidChannels$.subscribe(channels => {
      this.channels = channels;
    });
  }

  /**
   * Subscribes to the observable stream of valid users.
   */
  takeInUsers() {
    this.shared.subscribeValidUsers();

    this.userSub = this.shared.allValidUsers$.subscribe(users => {
      this.users = users;
    });
  }

  /**
   * Handles input changes and delegates logic to the write message service.
   * 
   * @param {SimpleChanges} changes - Changed input properties.
   */
  ngOnChanges(changes: SimpleChanges): void {
    this.writeMessages.handleChanges(this, changes);
  }

  /** 
   * Cleans up active subscriptions to prevent memory leaks.
   */
  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
    this.channelSub?.unsubscribe();
  }

  /**
   * Handles the selection of a mention (user or channel) from the mention dropdown.
   * Delegates processing to the MentionHandlerService and updates component state accordingly.
   * 
   * @param name - The mention text or identifier selected by the user.
   */
  onMentionSelected(mention: string): void {
    this.mentionHandler.handleMentionSelected(mention, this.users, this.channels,
      (m) => this.mentionComponent?.insertMention(m), (user) => {
        if (!this.mentionedUsers.some(u => u.id === user.id)) this.mentionedUsers.push(user);
      },
      (channel) => {
        if (!this.mentionedChannels.some(c => c.channelId === channel.channelId)) {
          this.mentionedChannels.push(channel);
        }
      },
      () => MentionUtilsService.syncEditorToForm(this.editor.nativeElement, this.messageForm.controls['message'])
    );
  }

  /**
   * Submits the current message by delegating to the WriteMessageService.
   */
  async onSubmit() {
    this.writeMessages.onSubmit(this);
  }

  /**
   * Sends a direct chat message to a specific user.
   * 
   * @param cleanedMessage - The sanitized message text to be sent.
   * @param user - The recipient user object.
   */
  async pushDirectChatMessages(cleanedMessage: string, user: User) {
    const chatId = this.getSortedChatId(user);
    await this.ensureDirectChatExists(chatId);

    const messagesRef = collection(this.firestore, 'directMessages', chatId, 'messages');
    await addDoc(messagesRef, {
      user: this.shared.actualUser.uid, text: cleanedMessage,
      timeStamp: serverTimestamp(), channelId: chatId
    });

    this.messageForm.reset();
  }

  /**
   * Returns a unique, sorted chat ID for a direct chat between the current user and the given user.
   * 
   * @param user - The other user involved in the chat.
   * @returns A string representing the combined and sorted chat ID.
   */
  private getSortedChatId(user: User): string {
    const sortedIds = [this.shared.actualUser.uid, user.id].sort();

    return sortedIds.join('_');
  }

  /**
   * Checks if a direct chat document exists for the given chat ID.
   * If not, creates a new document with that ID.
   * 
   * @param chatId - The unique identifier for the direct chat.
   */
  private async ensureDirectChatExists(chatId: string): Promise<void> {
    const directMessages = collection(this.firestore, 'directMessages');
    const q = query(directMessages, where('chatId', '==', chatId));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      const chatDocRef = doc(this.firestore, 'directMessages', chatId);

      await setDoc(chatDocRef, { chatId });
    }
  }

  /**
   * Sends a message to a specific channel by adding it to the channel's messages collection in Firestore.
   *
   * @param cleanedMessage - The message text to send, typically sanitized or processed.
   * @param channel - The channel object to which the message should be sent.
   * @returns A Promise that resolves once the message has been successfully added to Firestore.
   */
  async pushChannelMessages(cleanedMessage: string, channel: Channel) {
    const messagesRef = collection(this.firestore, 'channels', channel.channelId, 'messages');

    await addDoc(messagesRef, {
      user: this.shared.actualUser.uid, text: cleanedMessage, timeStamp: serverTimestamp(),
      channelId: channel.channelId
    });

    this.messageForm.reset();
  }

  /**
   * Toggles the mention overlay trigger between '@' and '#', resets query, and shows overlay.
   */
  toggleMentionOverlay() {
    this.toggleMention = this.toggleMention === '@' ? '#' : '@';

    this.mentionComponent?.mentionService.trigger$.next(this.toggleMention);
    this.mentionComponent?.mentionService.query$.next('');
    this.mentionComponent?.mentionService.showOverlay$.next(true);
  }

  /**
   * Resets the mention service on editor click to close any open mention overlays.
   */
  onEditorClick() {
    this.mentionComponent?.mentionService.reset();
  }

  /**
   * Handles content input in the editor: detects mention triggers and updates mention service accordingly.
   */
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

  /**
   * Handles key down events in the editor, delegating special keys to the mention utility service.
   * 
   * @param event - The keyboard event.
   */
  onEditorKeyDown(event: KeyboardEvent) {
    MentionUtilsService.handleEditorKeyDown(event, this.editor.nativeElement, this.messageForm.controls['message']);
  }

  /**
   * Handles the selection of a user from the mention list.
   * Delegates the user selection logic to the MentionSelectionService.
   *
   * @param {User} user - The user object that was selected.
   */
  onSelectUser(user: User) {
    this.mentionSelectionService.selectUser(this, user);
  }

  /**
   * Handles the selection of a channel from the mention list.
   * Delegates the channel selection logic to the MentionSelectionService.
   *
   * @param {Channel} channel - The channel object that was selected.
   */
  onSelectChannel(channel: Channel) {
    this.mentionSelectionService.selectChannel(this, channel);
  }

  /**
   * Listens for click events on the entire document.
   * - Closes the channel list dropdown if the user clicks outside the component element.
   *
   * @param event - The mouse click event.
   */
  @HostListener('document:click', ['$event'])
  handleClickOutside(event: MouseEvent) {
    if (this.showChannels && !this.eRef.nativeElement.contains(event.target)) this.showChannels = false;
  }

  /**
   * Handles document clicks to close overlays if the click is outside specific UI elements.
   * 
   * @param event - The mouse click event.
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
   * Focuses the message input editor and restores the cursor position.
   */
  public focusInput() {
    setTimeout(() => {
      this.editor?.nativeElement.focus();
      this.mentionComponent?.restoreCursorPosition();
    });
  }

  /**
   * Toggles the visibility of the emoji overlay based on the current mode.
   */
  toggleEmojiOverlay() {
    this.mode === 'thread' ? this.emojiThreadOverlay = !this.emojiThreadOverlay : this.emojiOverlay = !this.emojiOverlay;
  }

  /**
   * Adds a selected emoji by delegating to the WriteEmojiService.
   * 
   * @param selected - The emoji selected by the user.
   */
  addEmoji(selected: any): void {
    this.writeEmoji.addEmoji(this, selected);
  }
}