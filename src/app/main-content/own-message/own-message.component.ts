/**
 * Component to show the messages from the active users in the main-chat and in 
 * the answer/thread chat. It also shows the reactions of the message.
 * 
 */

import {Component, Input, HostListener, ElementRef, inject, ChangeDetectorRef, ViewContainerRef, ViewChild } from '@angular/core';
import { UserSharedService } from '../../userManagement/userManagement-service';
import { MessageSharedService } from '../message-service';
import { ChatMessage } from '../message.model';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { Firestore, Timestamp, orderBy, collection, query, onSnapshot, doc, QuerySnapshot, Query, QueryDocumentSnapshot, DocumentData } from '@angular/fire/firestore';
import { PickerComponent } from '@ctrl/ngx-emoji-mart';
import { CdkPortal, CdkPortalOutlet, PortalModule } from '@angular/cdk/portal';
import { Overlay, OverlayRef, OverlayPositionBuilder } from '@angular/cdk/overlay';
import { EmojiPickerComponent } from "./../../style-components/emoji-picker/emoji-picker.component"
import { Reaction } from "./../../../models/reaction.model";

@Component({
  selector: 'app-own-message',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    FormsModule,
    ReactiveFormsModule,
    PickerComponent,
    EmojiPickerComponent,
    PortalModule
  ],
  templateUrl: './own-message.component.html',
  styleUrl: './own-message.component.scss'
})
export class OwnMessageComponent {
  @Input() message!: ChatMessage;
  @Input() mode: 'default' | 'thread' = 'default';
  @Input() answerId?: string;
  @ViewChild(CdkPortal) portal!: CdkPortal;
  @ViewChild('smileyButton', { read: ElementRef }) smileyButtonRef!: ElementRef;
  private overlayRef: OverlayRef | null = null;
  private firestore = inject(Firestore);
  editOverlay: boolean = false;
  editMessageOverlay: boolean = false;
  showEditContainer:boolean = false;
  newMessage: string = "";
  answerDetails: ChatMessage[] = [];
  emojiOverlay:boolean = false;
  reactionDetails:Reaction[] = [];
  groupedReactions:any = {};
  groupedReactionsEmoji: any;
  answerGroupedReactions: { [answerId: string]: { [emoji: string]: Reaction[] } } = {};
  answerGroupedReactionsEmoji: { [answerId: string]: string[] } = {};
  hoveredEmoji: string | null = null;
  reactionUserNames: string[] = [];
  reactionUsersLoaded: boolean = false;
  reactionUser:string= "";
  answerReactionUser:string= "";
  answerMessages: ChatMessage[] = [];
  answerIds:string = "";
  reactionsLoaded = false;
  maxItems:number = 8;
  maxThreadsItems:number = 4; 
  maxItemsReached: boolean = false;
  reactionLength:number = 0;


  constructor(
      public sharedUser: UserSharedService,
      public sharedMessages: MessageSharedService,
      private elementRef: ElementRef,
      private viewContainerRef: ViewContainerRef,
      private cdr: ChangeDetectorRef,
      private overlay: Overlay,
      private overlayPositionBuilder: OverlayPositionBuilder,
    ) {}

  updateMessage = new FormGroup<{ activeMessage: FormControl<string> }>({
      activeMessage: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
  });

  @ViewChild('emojiPortalTemplate') emojiPortal!: CdkPortal;

/**
 * Angular lifecycle hook called once after the component has been initialized.
 * Initializes the form with the existing message text and fetches answer IDs.
 */
  ngOnInit(): void {
    if (this.message) {
      this.updateMessage.patchValue({ activeMessage: this.message.text });
    } 
    this.getAnswerIds();   
  }

/**
 * Angular lifecycle hook called when input-bound properties change.
 * Loads detailed answer data and channel reactions if message and channel ID are available.
 */
  ngOnChanges(): void {
    if (this.message?.id && this.message?.channelId) {
      this.getAnswerDetails();  
      this.getChannelReactions()  ;
    }
  }

/**
 * Toggles the visibility of the edit message overlay.
 */
  showEditMessageOverlay() {
    this.editMessageOverlay = !this.editMessageOverlay;
  }

/**
 * Listens for document-wide click events.
 * Closes the edit message overlay if the click occurred outside the component.
 * 
 * @param event - The mouse click event.
 */
  @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent) {
    const clickedInsideComponent = this.elementRef.nativeElement.contains(event.target);
    if (!clickedInsideComponent) {
    this.editMessageOverlay = false;
    }
  } 

  
 /**
 * Triggered on mouse over.
 * Shows the edit overlay if the edit container is not already visible.
 */
  onMouseOver() {
    if (!this.showEditContainer) {
      this.editOverlay = true;
    }
  }

  
 /**
 * Toggles the visibility of the edit container.
 * Hides the message edit overlay when opening the edit container.
 */
  showEditOverlay() {
    this.showEditContainer = !this.showEditContainer
    this.editMessageOverlay = false;
  }

 /**
 * Aborts the message editing process and hides the edit container.
 */
  abortUpdate() {
    this.showEditContainer = !this.showEditContainer
  }

 /**
 * Submits the updated message.
 * Sends the updated message to the shared message service and hides the edit container.
 */
  onSubmit () {
    this.newMessage = this.updateMessage.value.activeMessage ?? '';
    this.sharedMessages.updateMessage(this.message, this.newMessage);
    this.showEditContainer = false;   
  }

  /**
   * Handles the action when a user replies to a message (opens thread view).
   * - Marks the thread view as visible.
   * - Retrieves the current message as a thread parent.
   * - Updates the context (channel or user name).
   * - Loads answer messages depending on the selected context.
   */
  async answerMessage() {
    this.sharedUser.threadsVisible$.next(true);
    await this.sharedMessages.getAnswerMessage(this.message);
    this.sharedMessages.getChannelOrUserName();
    if (this.sharedMessages.channelSelected) {
      this.sharedMessages.getChannelAnswerMessages ();      
    } else if (this.sharedMessages.userSelected) {
      this.sharedMessages.getUserAnswerMessages (); 
    }
  }

  /**
   * Prepares and executes a Firestore query to fetch answers (thread replies)
   * for the current message. Determines the correct path based on whether a 
   * channel or direct message is selected.
   * Delegates snapshot subscription to a separate helper method.
   */
  async getAnswerDetails() {
    const channelId = this.message.channelId ?? '';
    const messageId = this.message.id ?? '';
    const collectionType = this.sharedMessages.channelSelected ? 'channels' : 'directMessages';
    const answerRef = collection(this.firestore, collectionType, channelId, 'messages', messageId, 'answers');  
    const q = query(answerRef, orderBy('timeStamp'));
    if(answerRef) {
        this.getAnswerDetailsFromFirebase(q)
    }  
  }

/**
 * Subscribes to Firestore snapshots of answer messages (thread replies).
 * Maps snapshot documents to `ChatMessage` objects and updates `answerDetails`.
 * 
 * @param q - A Firestore query for the answers subcollection, sorted by timestamp.
 */
  async getAnswerDetailsFromFirebase(q:any) {
      onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
        this.answerDetails = snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => {
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

  /**
  * Toggles the visibility of the emoji overlay.
  *
  * This method switches the `emojiOverlay` boolean flag, which determines whether
  * the emoji picker is shown or hidden. Typically triggered by clicking the emoji button.
  */
  openEmojiOverlay() {
    this.emojiOverlay = !this.emojiOverlay
  }

  /**
  * Adds an emoji reaction to the current message.
  *
  * - Closes the emoji overlay after an emoji is selected.
  * - Depending on the current mode (`default` or `thread`), it adds the emoji
  *   either to the main message or to a threaded reply.
  *
  * @param emoji - The selected emoji object (e.g., from the emoji picker component).
  */
  addEmoji(emoji:any) {    
    this.closeOverlay();
    if (this.mode !== 'thread') {
      this.sharedMessages.pushEmojiReaction(this.message, emoji);
    }else {
      this.sharedMessages.pushAnswerEmojiReaction(this.message, emoji)
    }    
  }

  /**
   * Fetches the reactions for the current message from Firestore.
   * Determines the correct collection path based on whether the message is in a channel or direct message.
   * Then initializes a real-time snapshot listener for the reactions.
   */
  getChannelReactions() {
    const channelId = this.message.channelId ?? '';
    const messageId = this.message.id ?? '';
    const collectionType = this.sharedMessages.channelSelected ? 'channels' : 'directMessages';

    const reactionRef = collection(this.firestore, collectionType, channelId, 'messages', messageId, 'reactions');
    const q = query(reactionRef, orderBy('emoji'));

    if (reactionRef) {
      this.subscribeToReactionSnapshot(q);
    }
  }

  /**
   * Subscribes to Firestore snapshot updates for the message's reactions.
   * Passes the snapshot to a helper method for processing.
   *
   * @param q - A Firestore query object that retrieves the message's reactions, ordered by emoji.
   */
  private subscribeToReactionSnapshot(q: Query<DocumentData>) {
    onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
      this.processReactionSnapshot(snapshot);
    });
  }

  /**
   * Processes a Firestore snapshot to extract and group reactions by emoji.
   * Updates `reactionDetails`, `groupedReactions`, and `groupedReactionsEmoji`.
   *
   * @param snapshot - A Firestore query snapshot containing the reaction documents.
   */
  private processReactionSnapshot(snapshot: QuerySnapshot<DocumentData>) {
    this.reactionDetails = snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => {
      const data = doc.data() as Reaction;
      return { ...data };
    });
    const groups = this.reactionDetails.reduce((groups: Record<string, Reaction[]>, reaction: Reaction) => {
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
   * Handles hover over a reaction emoji.
   * Sets the hovered emoji and triggers loading of usernames if not already loaded.
   * 
   * @param emoji - The emoji for which to show user reaction information.
   */
  showReactionInformation(emoji: string) {
    this.hoveredEmoji = emoji;
    const reactionsForEmoji = this.groupedReactions[emoji];
    if (this.reactionUsersLoaded) {
      return;
    }
    this.reactionUsersLoaded = true;
    this.loadReactionUserNames(reactionsForEmoji);
  }

  /**
   * Loads the display names of users who reacted with a specific emoji.
   * Updates the `reactionUserNames` array with display names retrieved from Firestore.
   * 
   * @param reactions - The list of reaction objects for a specific emoji.
   */
  private loadReactionUserNames(reactions: Reaction[]) {
    for (const reaction of reactions) {
      const userId = reaction.user;
      const userDocRef = doc(this.firestore, 'users', userId);
      onSnapshot(userDocRef, (docSnapshot) => {
        const name = docSnapshot.data()?.['displayName'];
        if (name) {
          this.reactionUserNames.push(name);
        }
      });
    }
  }

  /**
 * Subscribes to the observable containing answer messages and retrieves reactions for each answer.
 * 
 * This method listens to the `answerMessages$` observable from the shared message service.
 * For every emitted message (i.e., an answer), it calls `getAnswerReactions()` with the answer's ID
 * to fetch and process the associated emoji reactions.
 */
  getAnswerIds() { 
    this.sharedMessages.answerMessages$.subscribe(messages => {
      messages.forEach(answer => {
        this.getAnswerReactions(answer.id);      
      });
    });    
  }

  /**
   * Fetches and subscribes to reactions for a specific answer message in either a channel or direct message.
   * Determines Firestore collection path and delegates snapshot handling to `subscribeToAnswerReactions`.
   * 
   * @param answerId - The ID of the answer message to fetch reactions for.
   */
  getAnswerReactions(answerId: string) {
    const channelId = this.sharedMessages.selectedChannel?.channelId ?? '';
    const chatId = this.sharedMessages.selectedMessage?.channelId ?? '';
    const channelType = this.sharedMessages.channelSelected ? channelId : chatId;
    const messageId = this.sharedMessages.selectedMessage?.id ?? '';
    const collectionType = this.sharedMessages.channelSelected ? 'channels' : 'directMessages';
    const reactionsRef = collection(this.firestore, collectionType, channelType,'messages', messageId, 'answers', answerId, 'reactions');
    const q = query(reactionsRef, orderBy('emoji'));
    if (reactionsRef) {
      this.subscribeToAnswerReactions(q, answerId);
    }
  }

  /**
   * Groups an array of Reaction objects by their emoji.
   * 
   * @param reactions - Array of Reaction objects to group.
   * @returns An object where keys are emojis and values are arrays of reactions with that emoji.
   */
  private groupReactionsByEmoji(reactions: Reaction[]): { [emoji: string]: Reaction[] } {
    return reactions.reduce((acc: { [key: string]: Reaction[] }, reaction: Reaction) => {
      const emoji = reaction.emoji;
      if (!acc[emoji]) {
        acc[emoji] = [];
      }
      acc[emoji].push(reaction);
      return acc;
    }, {});
  }

  /**
   * Subscribes to a Firestore query that returns reactions for a given answer ID.
   * Processes the snapshot, groups reactions by emoji, and updates internal state for UI rendering.
   * 
   * @param q - The Firestore query to fetch reactions, ordered by emoji.
   * @param answerId - The ID of the answer message the reactions belong to.
   */
  private subscribeToAnswerReactions(q: Query<DocumentData>, answerId: string): void {
    onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
      const reactionDetails = snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => {
        const data = doc.data() as Reaction;
        return { ...data };
      });

      const groups = this.groupReactionsByEmoji(reactionDetails);

      this.answerGroupedReactions[answerId] = groups;
      this.answerGroupedReactionsEmoji[answerId] = Object.keys(groups);
      this.reactionLength = this.answerGroupedReactionsEmoji[answerId].length;

      this.cdr.detectChanges();
    });
  }

  /**
   * Shows information about reactions for a specific emoji on an answer message.
   * Sets the hovered emoji and loads user display names who reacted with that emoji.
   * Avoids reloading if users are already loaded.
   * 
   * @param emoji - The emoji to show reaction information for.
   */
  showAnswerReactionInformation(emoji: string): void {
    this.hoveredEmoji = emoji;
    const emojis = this.answerGroupedReactions[this.message.id][emoji];
    if (this.reactionUsersLoaded) {
      return;
    }
    this.reactionUsersLoaded = true;
    for (let j = 0; j < emojis.length; j++) {
      const reaction = emojis[j];
      const userId = reaction.user;
      this.fetchAndAddUserName(userId);
    }
  }

  /**
   * Fetches and appends the display name of a user by their user ID.
   * 
   * @param userId - The ID of the user whose name should be fetched.
   */
  private fetchAndAddUserName(userId: string): void {
    onSnapshot(doc(this.firestore, "users", userId), (doc) => {
      const name = doc.data()?.['displayName'];
      if (name) {
        this.reactionUserNames.push(name);
      }
    });
  }

/**
 * Resets the emoji reaction hover state.
 * Clears the hovered emoji, resets user loading flag, and empties the list of reaction user names.
 */
mouseOutReactionInformation() {
  this.hoveredEmoji = null;
  this.reactionUsersLoaded = false;
  this.reactionUserNames = [];
}

  /**
   * Expands the displayed list of emojis.
   * If not in thread mode, sets maxItems to the total number of reactions.
   * If in thread mode, sets maxThreadsItems to the total number of thread reactions.
   * Flags that the maximum number of items is reached.
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
   * Collapses the displayed list of emojis to a default smaller count.
   * Sets maxItems or maxThreadsItems back to their default values depending on the mode.
   * Flags that the maximum number of items is not reached.
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




