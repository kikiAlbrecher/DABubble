import { Component, inject, ElementRef, ViewChild, Input, OnChanges, Output, EventEmitter, OnInit, AfterViewChecked } from '@angular/core';
import { OwnMessageComponent } from "../own-message/own-message.component";
import { UserMessageComponent } from "../user-message/user-message.component";
import { UserSharedService } from '../../userManagement/userManagement-service';
import { MessageSharedService } from '../message-service';
import { combineLatest, Subscription } from 'rxjs';
import { ChatMessage } from '../message.model';
import { CommonModule } from '@angular/common';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { User } from '../../userManagement/user.interface';
import { Channel } from '../../../models/channel.class';

@Component({
  selector: 'app-message-board',
  standalone: true,
  imports: [
    OwnMessageComponent,
    UserMessageComponent,
    CommonModule,
  ],
  templateUrl: './message-board.component.html',
  styleUrl: './message-board.component.scss'
})
export class MessageBoardComponent implements OnInit, AfterViewChecked, OnChanges {
  @Input() message!: ChatMessage;
  @Input() selectedUser: User | null = null;
  @Input() selectedChannel: Channel | null = null;
  @Output() selectUser = new EventEmitter<User>();
  @Output() selectChannel = new EventEmitter<Channel>();
  @Output() showUserProfileMessage = new EventEmitter<void>();
  @ViewChild('messageContainer') private messageContainer!: ElementRef;

  constructor(
    public sharedUser: UserSharedService,
    public sharedMessages: MessageSharedService
  ) { }

  private firestore = inject(Firestore);
  messagesLength = 0;
  creatorName: [] = [];
  creatorId: string = '';
  private messSubscriptions = new Subscription();

  /**
   * Angular lifecycle hook called on component initialization.
   * Sets up subscription to selected user and channel observables,
   * reacting to changes by updating selection states and loading corresponding messages.
   */
  ngOnInit() {
    this.subscribeToSelectedEntities();
  }

  /**
   * Subscribes to the combined observable of selectedUser$ and selectedChannel$,
   * updates the sharedMessages service state accordingly,
   * and triggers message loading or channel creator retrieval based on the selection.
   */
  private subscribeToSelectedEntities() {
    const sub = combineLatest([
      this.sharedMessages.selectedUser$,
      this.sharedMessages.selectedChannel$
    ]).subscribe(([user, channel]) => {
      if (user) this.handleUserSelection(user);
      else if (channel) this.handleChannelSelection(channel);
      else this.clearSelections();
    });

    this.messSubscriptions.add(sub);
  }

  /**
   * Lifecycle hook that is called when the component is destroyed.
   * Unsubscribes from all active subscriptions to prevent memory leaks.
   */
  ngOnDestroy() {
    this.messSubscriptions.unsubscribe();
  }

  /**
   * Lifecycle hook called after the view has been checked by Angular.
   * If the number of messages has changed, it updates the message count and
   * handles scrolling to a target message or to the bottom.
   */
  ngAfterViewChecked() {
    if (this.sharedMessages.messages.length !== this.messagesLength) {
      this.messagesLength = this.sharedMessages.messages.length;
      this.handleTargetMessage();
    }
  }

  /**
   * Handles logic to either scroll to a specific target message (if set)
   * or scroll to the bottom of the message container.
   */
  private handleTargetMessage() {
    this.sharedMessages.targetMessageText ? this.findTargetMessage() : this.scrollToBottom();
  }

  /**
   * Searches the message container for a message that matches the target text.
   * If found, it scrolls that message into view and clears the target message flag.
   */
  private findTargetMessage() {
    const containers = this.messageContainer.nativeElement.querySelectorAll('.messages-container');

    for (let container of containers) {
      const text = container.textContent || '';
      if (text.includes(this.sharedMessages.targetMessageText)) {
        container.scrollIntoView({ behavior: 'smooth', block: 'center' });
        break;
      }
    }

    this.sharedMessages.targetMessageText = null;
  }

  /**
   * Lifecycle hook triggered when any data-bound property of a directive changes.
   * If a target message is specified, it waits briefly before attempting to scroll to it.
   */
  ngOnChanges() {
    if (this.sharedMessages.targetMessageText) setTimeout(() => this.scrollToTargetMessage(), 200);
  }

  /**
   * Attempts to scroll to a message in the container that matches the target text.
   * If found, scrolls the message into view and resets the target message flag.
   */
  private scrollToTargetMessage() {
    const containers = this.messageContainer.nativeElement.querySelectorAll('.messages-container');

    for (let container of containers) {
      const text = container.textContent || '';

      if (text.includes(this.sharedMessages.targetMessageText)) {
        container.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => this.sharedMessages.targetMessageText = null, 300);
        return;
      }
    }
  }

  /**
   * Scrolls the message container element to the bottom.
   * Uses a small delay to ensure the view has updated before scrolling.
   */
  scrollToBottom() {
    setTimeout(() => {
      this.messageContainer.nativeElement.scrollTop = this.messageContainer.nativeElement.scrollHeight + 24;
    }, 100);
  }

  /**
   * Handles logic when a user is selected.
   * Updates sharedMessages state to reflect user selection and loads user messages.
   * 
   * @param user The selected user object.
   */
  private handleUserSelection(user: any) {
    this.sharedMessages.selectedUser = user;
    this.sharedMessages.selectedChannel = null;
    this.sharedMessages.channelSelected = false;
    this.sharedMessages.userSelected = true;
    this.sharedMessages.getUserMessages();
    this.selectUser.emit(user);
  }

  /**
   * Handles logic when a channel is selected.
   * Updates sharedMessages state to reflect channel selection,
   * loads channel messages, and retrieves the channel creator.
   * 
   * @param channel The selected channel object.
   */
  private handleChannelSelection(channel: any) {
    this.sharedMessages.selectedChannel = channel;
    this.sharedMessages.selectedUser = null;
    this.sharedMessages.channelSelected = true;
    this.sharedMessages.userSelected = false;
    this.sharedMessages.getChannelMessages();
    this.getChannelCreator();
    this.selectChannel.emit(channel);
  }

  /**
   * Clears both user and channel selections in sharedMessages state.
   */
  private clearSelections() {
    this.sharedMessages.selectedUser = null;
    this.sharedMessages.selectedChannel = null;
  }

  /**
   * Emits an event to open the user profile view.
   */
  openProfileMessage() {
    this.showUserProfileMessage.emit();
  }

  /**
   * Retrieves the creator's user data for the currently selected channel
   * from Firestore and updates local state with the creator's ID and display name.
   */
  async getChannelCreator() {
    const creatorId = this.sharedMessages.selectedChannel?.channelCreatorId ?? '';
    this.creatorId = creatorId;
    const channelRef = doc(this.firestore, 'users', creatorId);
    const docSnap = await getDoc(channelRef);

    if (docSnap.exists()) {
      const user = docSnap.data();
      this.creatorName = user['displayName'];
    }
  }
}