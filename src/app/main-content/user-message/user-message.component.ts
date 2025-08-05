import { Component, Input, ElementRef, inject, ChangeDetectorRef, ViewContainerRef, ViewChild } from '@angular/core';
import { UserSharedService } from '../../userManagement/userManagement-service';
import { MessageSharedService } from '../message-service';
import { ChatMessage } from '../message.model';
import { CommonModule, DatePipe } from '@angular/common';
import { Firestore, Timestamp, orderBy, collection, query, onSnapshot, doc } from '@angular/fire/firestore';
import { CdkPortal, PortalModule } from '@angular/cdk/portal';
import { Overlay, OverlayRef, OverlayPositionBuilder } from '@angular/cdk/overlay';
import { EmojiPickerComponent } from "./../../style-components/emoji-picker/emoji-picker.component"
import { Reaction } from "./../../../models/reaction.model";

@Component({
  selector: 'app-user-message',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    EmojiPickerComponent,
    PortalModule
  ],
  templateUrl: './user-message.component.html',
  styleUrl: './user-message.component.scss'
})
export class UserMessageComponent {
  @Input() message!: ChatMessage;
  @Input() mode: 'default' | 'thread' = 'default';
  @ViewChild(CdkPortal) portal!: CdkPortal;
  @ViewChild('smileyButton', { read: ElementRef }) smileyButtonRef!: ElementRef;
  private overlayRef: OverlayRef | null = null;
  private firestore = inject(Firestore);
  userName: string = '';
  userPicture: string = '';
  editOverlay: boolean = false;
  newMessage: string = "";
  answerDetails: ChatMessage[] = [];
  editMessageOverlay: boolean = false;
  showEditContainer: boolean = false;
  emojiOverlay: boolean = false;
  reactionDetails: Reaction[] = [];
  groupedReactions: any = {};
  groupedReactionsEmoji: any;
  answerGroupedReactions: { [answerId: string]: { [emoji: string]: Reaction[] } } = {};
  answerGroupedReactionsEmoji: { [answerId: string]: string[] } = {};
  hoveredEmoji: string | null = null;
  reactionUserNames: string[] = [];
  reactionUsersLoaded: boolean = false;
  answerReactionUser: string = "";
  answerMessages: ChatMessage[] = [];
  answerIds: string = "";
  reactionsLoaded = false;
  maxItems: number = 8;
  maxThreadsItems: number = 4;
  maxItemsReached: boolean = false;
  reactionLength: number = 0;

  constructor(
    public sharedUser: UserSharedService,
    public sharedMessages: MessageSharedService,
    private elementRef: ElementRef,
    private viewContainerRef: ViewContainerRef,
    private cdr: ChangeDetectorRef,
    private overlay: Overlay,
    private overlayPositionBuilder: OverlayPositionBuilder,
  ) { }

  /**
  * Lifecycle-Hook, der nach der Initialisierung der Komponente aufgerufen wird.
  * 
  * Lädt den Benutzernamen und das Benutzerbild zur angezeigten Nachricht (falls vorhanden).
  * Fallbacks sind "Unbekannt" bzw. ein Platzhalterbild.
  * Danach wird die Methode `getAnswerIds()` aufgerufen, um Antwortnachrichten zu verfolgen.
  */
  async ngOnInit() {
    if (this.message?.user) {
      this.userName = await this.sharedMessages.getUserName(this.message.user) ?? 'Unbekannt';
      this.userPicture = await this.sharedMessages.getUserPicture(this.message.user) ?? 'assets/img/avatar-placeholder.svg';
      this.getAnswerIds();
    }
  }

  /**
  * Lifecycle-Hook, der aufgerufen wird, wenn sich Eingabewerte der Komponente ändern.
  * 
  * Wenn `message.id` und `message.channelId` gesetzt sind, werden:
  * - Die Details zu den Antwortnachrichten (`getAnswerDetails()`)
  * - sowie die Reaktionen zur Nachricht (`getChannelReactions()`) geladen.
  */
  ngOnChanges(): void {
    if (this.message?.id && this.message?.channelId) {
      this.getAnswerDetails();
      this.getChannelReactions();
    }
  }

  /**
  * Öffnet die Thread-Ansicht zur aktuellen Nachricht.
  * 
  * - Schaltet `threadsVisible$` in `UserSharedService` auf `true`, um die Thread-Ansicht zu aktivieren.
  * - Lädt über `getAnswerMessage()` die Details zur Thread-Nachricht.
  * - Ruft `getChannelOrUserName()` auf, um Kontextinfos zu laden.
  * - Je nach Auswahl lädt entweder Kanal- oder Direktnachrichten-Antworten.
  */
  async answerMessage() {
    this.sharedUser.threadsVisible$.next(true);
    await this.sharedMessages.getAnswerMessage(this.message);
    this.sharedMessages.getChannelOrUserName();
    if (this.sharedMessages.channelSelected) {
      this.sharedMessages.getChannelAnswerMessages();
    } else if (this.sharedMessages.userSelected) {
      this.sharedMessages.getUserAnswerMessages();
    }
  }

  /**
  * Fetches all replies to the current message from Firestore in real-time.
  *
  * Determines the correct subcollection path (`answers`) based on whether the current context
  * is a channel or a direct message, and subscribes to live updates using `onSnapshot`.
  * The fetched replies are stored in the `answerDetails` array, with proper timestamp conversion.
  */
  async getAnswerDetails(): Promise<void> {
    const collectionType = this.getCollectionType();
    const channelId = this.message.channelId ?? '';
    const messageId = this.message.id ?? '';

    const answerRef = collection(this.firestore, collectionType, channelId, 'messages', messageId, 'answers');
    const q = query(answerRef, orderBy('timeStamp'));

    onSnapshot(q, snapshot => {
      this.answerDetails = snapshot.docs.map(doc => this.mapAnswerDoc(doc));
    });
  }

  /**
   * Determines whether the current message belongs to a channel or a direct message conversation.
   *
   * @returns `'channels'` if a channel is selected, otherwise `'directMessages'`
   */
  private getCollectionType(): 'channels' | 'directMessages' {
    return this.sharedMessages.channelSelected ? 'channels' : 'directMessages';
  }

  /**
   * Maps a Firestore document to a `ChatMessage` object and converts the timestamp
   * to a native JavaScript `Date` object if necessary.
   *
   * @param doc A Firestore document representing an answer message
   * @returns A formatted `ChatMessage` object with a readable timestamp
   */
  private mapAnswerDoc(doc: any): ChatMessage {
    const data = doc.data() as ChatMessage;
    return {
      ...data,
      id: doc.id,
      timeStamp: data.timeStamp instanceof Timestamp
        ? data.timeStamp.toDate()
        : data.timeStamp
    };
  }

  /**
  * Handles the mouse over event on a message container.
  * 
  * Shows the edit overlay (e.g., emoji/reply icons) only if the message is not in 
  * a fixed edit mode (controlled by `showEditContainer`).
  */
  onMouseOver() {
    if (!this.showEditContainer) {
      this.editOverlay = true;
    }
  }

  /**
  * Handles the event when an emoji is selected from the emoji picker.
  *
  * Closes the emoji picker overlay, and sends the selected emoji as a reaction.
  * The target depends on the current mode:
  * - In **standard mode**, the emoji is sent as a message reaction.
  * - In **thread mode**, the emoji is added as a reaction to a thread reply.
  *
  * @param emoji The selected emoji object or string (depending on picker library)
  */
  addEmoji(emoji: any) {
    this.closeOverlay();
    if (this.mode !== 'thread') {
      this.sharedMessages.pushEmojiReaction(this.message, emoji);
    } else {
      this.sharedMessages.pushAnswerEmojiReaction(this.message, emoji)
    }
  }

  /**
   * Loads and listens to emoji reactions for the current message from Firestore.
   * 
   * Determines the correct collection (channels or directMessages), queries reactions ordered by emoji,
   * maps the results, and groups them by emoji for UI display.
   */
  getChannelReactions() {
    const channelId = this.message.channelId ?? '';
    const messageId = this.message.id ?? '';
    const collectionType = this.sharedMessages.channelSelected ? 'channels' : 'directMessages';
    const reactionRef = collection(this.firestore, collectionType, channelId, 'messages', messageId, 'reactions');
    const q = query(reactionRef, orderBy('emoji'));
    if (reactionRef) {
      onSnapshot(q, snapshot => {
        this.reactionDetails = this.mapReactions(snapshot);
        this.groupReactions(this.reactionDetails);
      });
    }
  }

  /**
   * Converts Firestore snapshot documents into an array of Reaction objects.
   * 
   * @param snapshot - Firestore snapshot of the reactions subcollection
   * @returns An array of Reaction objects
   */
  private mapReactions(snapshot: any): Reaction[] {
    return snapshot.docs.map((doc: any) => {
      const data = doc.data() as Reaction;
      return { ...data };
    });
  }

  /**
   * Groups the given reactions by emoji and stores the result in component properties.
   * 
   * Updates `groupedReactions` and `groupedReactionsEmoji`.
   * 
   * @param reactions - Array of Reaction objects to group
   */
  private groupReactions(reactions: Reaction[]): void {
    const groups = reactions.reduce((groups: any, reaction: Reaction) => {
      const emoji = reaction.emoji;
      if (!groups[emoji]) {
        groups[emoji] = [];
      }
      groups[emoji].push(reaction);
      return groups;
    }, {});

    this.groupedReactions = groups;
    this.groupedReactionsEmoji = Object.keys(groups);
  }

  /**
   * Handles mouse hover on a specific emoji to show which users reacted with it.
   * 
   * - Sets the currently hovered emoji
   * - Prevents duplicate fetching using `reactionUsersLoaded`
   * - Loads user display names for all reactions of the given emoji
   * 
   * @param emoji The emoji string that is being hovered
   */
  showReactionInformation(emoji: string): void {
    this.hoveredEmoji = emoji;
    const emojis = this.groupedReactions[emoji];
    if (this.reactionUsersLoaded) {
      return;
    }
    this.reactionUsersLoaded = true;
    this.loadUserNamesForReactions(emojis);
  }

  /**
   * Fetches and stores the display names of users who reacted.
   * 
   * For each reaction, retrieves the user document and pushes the `displayName`
   * into the `reactionUserNames` array.
   * 
   * @param reactions An array of Reaction objects for a specific emoji
   */
  private loadUserNamesForReactions(reactions: Reaction[]): void {
    for (let j = 0; j < reactions.length; j++) {
      const reaction = reactions[j];
      const userId = reaction.user;
      onSnapshot(doc(this.firestore, "users", userId), (docSnapshot) => {
        const name = docSnapshot.data()?.['displayName'];
        if (name) {
          this.reactionUserNames.push(name);
        }
      });
    }
  }

  /**
   * Subscribes to the observable stream of answer messages (`answerMessages$`)
   * and triggers the loading of reactions for each individual answer message.
   * 
   * For every message received via the stream, the `getAnswerReactions` method 
   * is called with the answer's message ID.
   */
  getAnswerIds() {
    this.sharedMessages.answerMessages$.subscribe(messages => {
      messages.forEach(answer => {
        this.getAnswerReactions(answer.id);
      });
    });
  }

  /**
   * Resets the state related to emoji hover tooltips.
   * 
   * - Clears the currently hovered emoji
   * - Resets the loaded state to allow future reaction user data to be fetched again
   * - Clears the list of loaded user display names
   */
  mouseOutReactionInformation() {
    this.hoveredEmoji = null;
    this.reactionUsersLoaded = false;
    this.reactionUserNames = [];
  }

  /**
   * Main method to fetch and group emoji reactions for a specific answer message.
   * 
   * @param answerId - The ID of the answer message to retrieve reactions for.
   */
  getAnswerReactions(answerId: string) {
    const reactionsRef = this.buildAnswerReactionsRef(answerId);
    const q = query(reactionsRef, orderBy('emoji'));
    if (reactionsRef) {
      onSnapshot(q, snapshot => {
        const reactionDetails = this.mapReactionDocs(snapshot);
        const groups = this.groupReactionsByEmoji(reactionDetails);
        this.answerGroupedReactions[answerId] = groups;
        this.answerGroupedReactionsEmoji[answerId] = Object.keys(groups);
        this.reactionLength = this.answerGroupedReactionsEmoji[answerId].length;
        this.cdr.detectChanges();
      });
    }
  }

  /**
   * Builds the Firestore reference path to the 'reactions' subcollection 
   * of a specific answer message.
   * 
   * @param answerId - The ID of the answer message.
   * @returns CollectionReference to the reactions.
   */
  private buildAnswerReactionsRef(answerId: string) {
    const channelId = this.sharedMessages.selectedChannel?.channelId ?? '';
    const chatId = this.sharedMessages.selectedMessage?.channelId ?? '';
    const channelTyp = this.sharedMessages.channelSelected ? channelId : chatId;
    const messageId = this.sharedMessages.selectedMessage?.id ?? '';
    const collectionType = this.sharedMessages.channelSelected ? 'channels' : 'directMessages';
    return collection(
      this.firestore,
      collectionType,
      channelTyp,
      'messages',
      messageId,
      'answers',
      answerId,
      'reactions'
    );
  }

  /**
   * Maps Firestore snapshot documents to an array of Reaction objects.
   * 
   * @param snapshot - QuerySnapshot from Firestore.
   * @returns Array of Reaction objects.
   */
  private mapReactionDocs(snapshot: any): Reaction[] {
    return snapshot.docs.map((doc: any) => {
      const data = doc.data() as Reaction;
      return {
        ...data,
      };
    });
  }

  /**
   * Groups an array of reactions by emoji.
   * 
   * @param reactionDetails - Array of Reaction objects.
   * @returns An object where keys are emojis and values are arrays of reactions.
   */
  private groupReactionsByEmoji(reactionDetails: Reaction[]): any {
    return reactionDetails.reduce((groups: any, reaction: Reaction) => {
      const emoji = reaction.emoji;
      if (!groups[emoji]) {
        groups[emoji] = [];
      }
      groups[emoji].push(reaction);
      return groups;
    }, {});
  }

  /**
   * Shows reaction information for a specific emoji on an answer message.
   * Loads the user names who reacted with this emoji if not already loaded.
   * 
   * @param emoji - The emoji to display reaction info for.
   */
  showAnswerReactionInformation(emoji: string) {
    this.hoveredEmoji = emoji;
    if (this.reactionUsersLoaded) {
      return;
    }
    this.reactionUsersLoaded = true;
    const emojis = this.answerGroupedReactions[this.message.id][emoji];
    this.loadReactionUserNames(emojis);
  }

  /**
   * Loads the display names of users from an array of reactions and adds them to reactionUserNames.
   * 
   * @param emojis - Array of Reaction objects representing users who reacted with an emoji.
   */
  private loadReactionUserNames(emojis: Reaction[]) {
    for (let j = 0; j < emojis.length; j++) {
      const reaction = emojis[j];
      const userId = reaction.user;
      onSnapshot(doc(this.firestore, "users", userId), (doc) => {
        const name = doc.data()!['displayName'];
        this.reactionUserNames.push(name);
      });
    }
  }

  /**
   * Expands the displayed emoji reactions to show all available emojis.
   * Adjusts the maximum items shown based on the current mode (thread or normal).
   */
  showMoreEmojis() {
    if (this.mode !== 'thread') {
      this.maxItems = this.reactionDetails.length;
    } else {
      this.maxThreadsItems = this.reactionLength;
    }
    this.maxItemsReached = true;
  }

  /**
   * Reduces the displayed emoji reactions to a default limited number.
   * Resets the maximum items shown based on the current mode (thread or normal).
   */
  showLessEmojis() {
    if (this.mode !== 'thread') {
      this.maxItems = 8;
    } else {
      this.maxThreadsItems = 4;
    }
    this.maxItemsReached = false;
  }

  /**
   * Opens a modal overlay positioned relative to the smiley button element.
   * The overlay is connected flexibly to the button, appearing just below it with a slight vertical offset.
   * The overlay has a transparent backdrop that closes the overlay when clicked outside.
   * It also closes when the user scrolls.
   */
  openModal() {
    const positionStrategy = this.overlayPositionBuilder
      .flexibleConnectedTo(this.smileyButtonRef)
      .withPositions([
        {
          originX: 'start',
          originY: 'bottom',
          overlayX: 'start',
          overlayY: 'top',
          offsetY: 8,
        }
      ]);
    this.overlayRef = this.overlay.create({
      positionStrategy,
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-transparent-backdrop',
      scrollStrategy: this.overlay.scrollStrategies.close()
    });
    this.overlayRef.backdropClick().subscribe(() => this.closeOverlay());
    this.overlayRef.attach(this.portal);
  }

  /**
  * Closes the emoji-overlay
  */
  closeOverlay() {
    if (this.overlayRef) {
      this.overlayRef.dispose();
      this.overlayRef = null;
    }
  }
}