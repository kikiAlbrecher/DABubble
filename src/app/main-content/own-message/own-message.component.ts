import { inject, ViewContainerRef, ViewChild } from '@angular/core';
import { Component, Input, HostListener, ElementRef} from '@angular/core';
import { UserSharedService } from '../../userManagement/userManagement-service';
import { MessageSharedService } from '../message-service';
import { ChatMessage } from '../message.model';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { Firestore, Timestamp, orderBy, collection, query, onSnapshot } from '@angular/fire/firestore';
import { PickerComponent } from '@ctrl/ngx-emoji-mart';
import { CdkPortal, CdkPortalOutlet } from '@angular/cdk/portal';
import { EmojiPickerComponent } from "./../../style-components/emoji-picker/emoji-picker.component"

@Component({
  selector: 'app-own-message',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    FormsModule,
    ReactiveFormsModule,
    PickerComponent,
    EmojiPickerComponent

  ],
  templateUrl: './own-message.component.html',
  styleUrl: './own-message.component.scss'
})
export class OwnMessageComponent {
  @Input() message!: ChatMessage;
  @Input() mode: 'default' | 'thread' = 'default';
  private firestore = inject(Firestore);
  editOverlay: boolean = false;
  editMessageOverlay: boolean = false;
  showEditContainer:boolean = false;
  newMessage: string = "";
  answerDetails: ChatMessage[] = [];
  emojiOverlay:boolean = false;
  

  constructor(
      public sharedUser: UserSharedService,
      public sharedMessages: MessageSharedService,
      private elementRef: ElementRef,
      private viewContainerRef: ViewContainerRef
    ) {}

  updateMessage = new FormGroup<{ activeMessage: FormControl<string> }>({
      activeMessage: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
  });

  @ViewChild('emojiPortalTemplate') emojiPortal!: CdkPortal;

  ngOnInit(): void {
    if (this.message) {
      this.updateMessage.patchValue({ activeMessage: this.message.text });
    }    
  }

  ngOnChanges(): void {
    if (this.message?.id && this.message?.channelId) {
      this.getAnswerDetails();    
    }
  }

  showEditMessageOverlay() {
    this.editMessageOverlay = !this.editMessageOverlay;
  }

  @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent) {
    const clickedInsideComponent = this.elementRef.nativeElement.contains(event.target);
    if (!clickedInsideComponent) {
    this.editMessageOverlay = false;
    }
  } 

  onMouseOver() {
  if (!this.showEditContainer) {
    this.editOverlay = true;
  }
}

  showEditOverlay() {
    this.showEditContainer = !this.showEditContainer
    this.editMessageOverlay = false;
  }

  abortUpdate() {
    this.showEditContainer = !this.showEditContainer
  }

  onSubmit () {
    this.newMessage = this.updateMessage.value.activeMessage ?? '';
    this.sharedMessages.updateMessage(this.message, this.newMessage);
    this.showEditContainer = false;   
  }

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

  async getAnswerDetails() {
    const channelId = this.message.channelId ?? '';
    const messageId = this.message.id ?? '';
    const answerRef = collection(this.firestore, 'channels', channelId, 'messages', messageId, 'answers');  
    const q = query(answerRef, orderBy('timeStamp'));
    if(answerRef) {
      onSnapshot(q, snapshot => {
        this.answerDetails = snapshot.docs.map(doc => {
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
  }

  openEmojiOverlay() {
    this.emojiOverlay = !this.emojiOverlay
  }


  addEmoji(emoji:any) {
    
    this.emojiOverlay = !this.emojiOverlay;
    this.sharedMessages.pushEmojiReaction(this.message, emoji);
  }
}




