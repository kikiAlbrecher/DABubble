import { Component, inject, AfterViewChecked, ElementRef, ViewChild, Input, OnChanges, Output, EventEmitter } from '@angular/core';
import { OwnMessageComponent } from "../own-message/own-message.component";
import { UserMessageComponent } from "../user-message/user-message.component";
import { UserSharedService } from '../../userManagement/userManagement-service';
import { MessageSharedService } from '../message-service';
import { combineLatest } from 'rxjs';
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
export class MessageBoardComponent implements OnChanges {
  @Input() message!: ChatMessage;
  @Input() selectedUser: User | null = null;
  @Input() selectedChannel: Channel | null = null;
  @Output() selectUser = new EventEmitter<User>();
  @Output() selectChannel = new EventEmitter<Channel>();

  constructor(
    public sharedUser: UserSharedService,
    public sharedMessages: MessageSharedService
  ) { }

  @ViewChild('messageContainer') private messageContainer!: ElementRef;
  private firestore = inject(Firestore);
  messagesLength = 0;
  creatorName: [] = [];
  creatorId: string = ""

  /**
   * Angular lifecycle hook that is called after the view has been checked.
   * It compares the current number of messages with the previous count,
   * and if there are new messages, it updates the count and scrolls the view to the bottom.
   */
  ngAfterViewChecked() {
    if (this.sharedMessages.messages.length !== this.messagesLength) {
      this.messagesLength = this.sharedMessages.messages.length;

      // Wenn ein Zieltext gespeichert ist, suche danach im DOM
      if (this.sharedMessages.targetMessageText) {
        const containers = this.messageContainer.nativeElement.querySelectorAll('.messages-container');

        for (let container of containers) {
          const text = container.textContent || '';
          if (text.includes(this.sharedMessages.targetMessageText)) {
            container.scrollIntoView({ behavior: 'smooth', block: 'center' });
            break;
          }
        }

        // Nur einmal scrollen, dann zurücksetzen
        this.sharedMessages.targetMessageText = null;
      } else {
        // Standardverhalten: ans Ende scrollen
        this.scrollToBottom();
      }
    }
  }

  ngOnChanges() {
    if (this.sharedMessages.targetMessageText) {
      setTimeout(() => this.scrollToTargetMessage(), 200);
    }
  }

  private scrollToTargetMessage() {
    const containers = this.messageContainer.nativeElement.querySelectorAll('.messages-container');
    for (let container of containers) {
      const text = container.textContent || '';
      if (text.includes(this.sharedMessages.targetMessageText)) {
        container.scrollIntoView({ behavior: 'smooth', block: 'center' });
        this.sharedMessages.targetMessageText = null;
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
    combineLatest([
      this.sharedMessages.selectedUser$,
      this.sharedMessages.selectedChannel$
    ]).subscribe(([user, channel]) => {
      if (user) {
        this.handleUserSelection(user);
      } else if (channel) {
        this.handleChannelSelection(channel);
      } else {
        this.clearSelections();
      }
    });
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
   * Toggles the visibility of the user detail overlay.
   * If the overlay is currently visible, it will be hidden, and vice versa.
   */
  openUserDetail() {
    this.sharedUser.detailOverlay = !this.sharedUser.detailOverlay;
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



