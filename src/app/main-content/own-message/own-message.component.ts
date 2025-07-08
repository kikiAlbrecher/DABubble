import { Injectable, inject } from '@angular/core';
import { SimpleChanges } from '@angular/core';
import { Component, Input, HostListener, ElementRef, OnInit } from '@angular/core';
import { UserSharedService } from '../../userManagement/userManagement-service';
import { MessageSharedService } from '../message-service';
import { ChatMessage } from '../message.model';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { Firestore, Timestamp, orderBy, serverTimestamp, updateDoc, collection, getDoc, getDocs, setDoc, addDoc, query, where, onSnapshot } from '@angular/fire/firestore';

@Component({
  selector: 'app-own-message',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    FormsModule,
    ReactiveFormsModule

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
  

  constructor(
      public sharedUser: UserSharedService,
      public sharedMessages: MessageSharedService,
      private elementRef: ElementRef
    ) {}

  updateMessage = new FormGroup<{ activeMessage: FormControl<string> }>({
      activeMessage: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
  });

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
    this.sharedMessages.getChannelAnswerMessages ();
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
}
