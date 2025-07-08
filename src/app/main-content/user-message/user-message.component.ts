import { Component, Input, inject } from '@angular/core';
import { UserSharedService } from '../../userManagement/userManagement-service';
import { MessageSharedService } from '../message-service';
import { ChatMessage } from '../message.model';
import { CommonModule, DatePipe } from '@angular/common';
import { Firestore, Timestamp, orderBy, collection, query, onSnapshot } from '@angular/fire/firestore';

@Component({
  selector: 'app-user-message',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe
  ],
  templateUrl: './user-message.component.html',
  styleUrl: './user-message.component.scss'
})
export class UserMessageComponent {
  @Input() message!: ChatMessage;
  @Input() mode: 'default' | 'thread' = 'default';
  private firestore = inject(Firestore);
  userName: string = '';
  userPicture: string = '';
  editOverlay: boolean = false;
  newMessage: string = "";
  answerDetails: ChatMessage[] = [];
  
  constructor(
    public sharedUser: UserSharedService,
    public sharedMessages: MessageSharedService
  ) {}   
 

  async ngOnInit() {
    if (this.message?.user) {
      this.userName = await this.sharedMessages.getUserName(this.message.user) ?? 'Unbekannt';
      this.userPicture = await this.sharedMessages.getUserPicture(this.message.user) ?? 'assets/img/avatar-placeholder.svg';
    }
  }

  ngOnChanges(): void {
    if (this.message?.id && this.message?.channelId) {
      this.getAnswerDetails();    
    }
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

}
