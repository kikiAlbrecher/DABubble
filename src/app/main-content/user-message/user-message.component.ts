import {Component, Input, HostListener, ElementRef, inject, ChangeDetectorRef, ViewContainerRef, ViewChild } from '@angular/core';
import { UserSharedService } from '../../userManagement/userManagement-service';
import { MessageSharedService } from '../message-service';
import { ChatMessage } from '../message.model';
import { CommonModule, DatePipe } from '@angular/common';
import { Firestore, Timestamp, orderBy, collection, query, onSnapshot, doc } from '@angular/fire/firestore';
import { PickerComponent } from '@ctrl/ngx-emoji-mart';
import { CdkPortal, CdkPortalOutlet } from '@angular/cdk/portal';
import { EmojiPickerComponent } from "./../../style-components/emoji-picker/emoji-picker.component"
import { Reaction } from "./../../../models/reaction.model";


@Component({
  selector: 'app-user-message',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    PickerComponent,
    EmojiPickerComponent,
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
  editMessageOverlay: boolean = false;
  showEditContainer:boolean = false;
  emojiOverlay:boolean = false;
  reactionDetails:Reaction[] = [];
  groupedReactions:any = {};
  groupedReactionsEmoji: any;
  answerGroupedReactions: { [answerId: string]: { [emoji: string]: Reaction[] } } = {};
  answerGroupedReactionsEmoji: { [answerId: string]: string[] } = {};
  hoveredEmoji: string | null = null;
  reactionUserNames: string[] = [];
  reactionUsersLoaded: boolean = false;
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
    private cdr: ChangeDetectorRef
  ) {}   
 

  async ngOnInit() {
    if (this.message?.user) {
      this.userName = await this.sharedMessages.getUserName(this.message.user) ?? 'Unbekannt';
      this.userPicture = await this.sharedMessages.getUserPicture(this.message.user) ?? 'assets/img/avatar-placeholder.svg';
      this.getAnswerIds();   
    }
  }

  ngOnChanges(): void {
    if (this.message?.id && this.message?.channelId) {
      this.getAnswerDetails();    
      this.getChannelReactions()  ;
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
      const collectionType = this.sharedMessages.channelSelected ? 'channels' : 'directMessages';
      const answerRef = collection(this.firestore, collectionType, channelId, 'messages', messageId, 'answers');  
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

  onMouseOver() {
    if (!this.showEditContainer) {
      this.editOverlay = true;
    }
  }

 openEmojiOverlay() {
    this.emojiOverlay = !this.emojiOverlay
  }
 
  addEmoji(emoji:any) {    
    this.emojiOverlay = !this.emojiOverlay;
    if (this.mode !== 'thread') {
      this.sharedMessages.pushEmojiReaction(this.message, emoji);
    }else {
      this.sharedMessages.pushAnswerEmojiReaction(this.message, emoji)
    }    
  }
 
   getChannelReactions() {
     const channelId = this.message.channelId ?? '';
     const messageId = this.message.id ?? '';    
     const collectionType = this.sharedMessages.channelSelected ? 'channels' : 'directMessages';
     const reactionRef = collection(this.firestore, collectionType, channelId, 'messages', messageId, 'reactions');  
     const q = query(reactionRef, orderBy('emoji'));
     if(reactionRef) {
       onSnapshot(q, snapshot => {
         this.reactionDetails = snapshot.docs.map(doc => {
         const data = doc.data() as Reaction;                    
         return {
             ...data,
         };            
         });        
         const groups = this.reactionDetails.reduce((groups:any, reaction: Reaction) => {
         const emoji =  reaction.emoji;
         if (!groups[emoji]) {
                 groups[emoji] = [];
             }
         groups[emoji].push(reaction);               
         return groups;
         }, {});
         this.groupedReactions = groups;                    
         this.groupedReactionsEmoji = Object.keys(groups);  
         
      
         // const emojis = this.groupedReactionsEmoji;
         // for (let i = 0; i < emojis.length; i++) {
         //   const emoji = emojis[i];
         //   const reactionsForEmoji = this.groupedReactions[emoji];
 
         //   for (let j = 0; j < reactionsForEmoji.length; j++) {
         //     const reaction = reactionsForEmoji[j];
         //     const userId = reaction.user;
         //     onSnapshot(doc(this.firestore, "users", userId), (doc) => {
         //     this.reactionUser = doc.data()!['displayName']             
         //     });
         //   }          
         // }   
       });         
     }     
   }
 
  showReactionInformation(emoji:string) {
    this.hoveredEmoji = emoji;
    const emojis = this.groupedReactions[emoji];    
    if (this.reactionUsersLoaded) {
       return 
    } 
    this.reactionUsersLoaded = true;   
    for (let j = 0; j < emojis.length; j++) {
      const reaction = emojis[j];
      const userId = reaction.user;         
      onSnapshot(doc(this.firestore, "users", userId), (doc) => {
        const name = doc.data()!['displayName'];
        this.reactionUserNames.push(name);            
      });
    }      
  }
 
   getAnswerIds() {
     this.sharedMessages.answerMessages$.subscribe(messages => {
       messages.forEach(answer => {
         this.getAnswerReactions(answer.id);      
       });
     });    
   }

   mouseOutReactionInformation() {
    this.hoveredEmoji = null;
    this.reactionUsersLoaded = false;
    this.reactionUserNames = [];
   }
 
  getAnswerReactions(answerId: string) {
    const channelId = this.sharedMessages.selectedChannel?.channelId ?? '';
    const chatId = this.sharedMessages.selectedMessage?.channelId ?? "";
    const channelTyp = this.sharedMessages.channelSelected ? channelId : chatId;
    const messageId = this.sharedMessages.selectedMessage?.id ?? '';
    const collectionType = this.sharedMessages.channelSelected ? 'channels' : 'directMessages';
    const reactionsRef = collection(this.firestore, collectionType, channelTyp, 'messages', messageId, 'answers', answerId, 'reactions');
    const q = query(reactionsRef, orderBy('emoji'));
     if (reactionsRef) {
       onSnapshot(q, snapshot => {
         const reactionDetails = snapshot.docs.map(doc => {
           const data = doc.data() as Reaction;
           return {
             ...data,
           };
         });
         const groups = reactionDetails.reduce((groups: any, reaction: Reaction) => {
           const emoji = reaction.emoji;
           if (!groups[emoji]) {
             groups[emoji] = [];
           }
           groups[emoji].push(reaction);
           return groups;
         }, {});
         this.answerGroupedReactions[answerId] = groups;
         this.answerGroupedReactionsEmoji[answerId] = Object.keys(groups);  
         this.reactionLength = this.answerGroupedReactionsEmoji[answerId].length;
         this.cdr.detectChanges();          
       });
     }
   }
 
   showAnswerReactionInformation(emoji:string) {
     this.hoveredEmoji = emoji;
     const emojis = this.answerGroupedReactions[this.message.id][emoji];
     if (this.reactionUsersLoaded) {
       return 
    } 
    this.reactionUsersLoaded = true;   
    for (let j = 0; j < emojis.length; j++) {
      const reaction = emojis[j];
      const userId = reaction.user;         
      onSnapshot(doc(this.firestore, "users", userId), (doc) => {
        const name = doc.data()!['displayName'];
        this.reactionUserNames.push(name);            
      });
    }      
   }

  showMoreEmojis() {
    if (this.mode !== 'thread') {
    this.maxItems = this.reactionDetails.length;
    }else {
      this.maxThreadsItems = this.reactionLength; 
    }
    this.maxItemsReached = true;
  }

  showLessEmojis() {
    if (this.mode !== 'thread') {
      this.maxItems = 8;
    } else {
      this.maxThreadsItems = 4;
    }  
    this.maxItemsReached = false;
  }
  



}
