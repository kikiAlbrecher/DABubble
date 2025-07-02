import { Component, Input, Output, EventEmitter, inject, OnChanges, SimpleChanges } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { User } from '../../userManagement/user.interface';
import { CommonModule } from '@angular/common';
import { Firestore, serverTimestamp, collection, getDoc, getDocs, setDoc, addDoc, query, where, onSnapshot } from '@angular/fire/firestore';
import { user } from '@angular/fire/auth';
import { DialogAddMemberComponent } from '../dialog-add-member/dialog-add-member.component';
import { UserSharedService } from '../../userManagement/userManagement-service';
import { doc } from 'firebase/firestore';
import { UserImageStatusComponent } from "../../style-components/user-image-status/user-image-status.component";
import { Channel } from '../../../models/channel.class';

@Component({
  selector: 'app-write-message',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CommonModule,
    UserImageStatusComponent
],
  templateUrl: './write-message.component.html',
  styleUrl: './write-message.component.scss'
})
export class WriteMessageComponent {

  constructor(
    public shared: UserSharedService) {}

  textError: boolean = false;
  @Input() selectedUser: User | null = null;
  @Input() user!: User;
  @Output() selectUser = new EventEmitter<User>();
  @Input() selectedChannel: Channel | null = null;
  
  private firestore = inject(Firestore);
  chatExists: boolean = true;
  channelMessagesExist: boolean = true;
  users: User[] = [];
  selectedChannelId: string | null = null;
  selectedUserId: string | null = null;
 
  messageForm = new FormGroup({
    message: new FormControl('', [Validators.required]),
    
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedUser'] && this.selectedUser) {
      this.checkChatExists();
    } else if (changes['selectedChannel'] && this.selectedChannel) {
      this.checkChannelMessagesExist()
      
    }
  }

  checkChatExists() {
    const sortedIds = [this.shared.actualUser.uid, this.selectedUser?.id].sort(); 
    const chatId = sortedIds.join('_');   
    const directMessages = collection(this.firestore, "directMessages");
    const q = query(directMessages, where('chatId', '==', chatId));
    onSnapshot(q, (querySnapshot) => {
      this.chatExists = !querySnapshot.empty;
    }); 
  }

  async checkChannelMessagesExist() {
    const selectedId = this.selectedChannel?.channelId ?? ''
    const chatDocRef = doc(this.firestore, 'channels', selectedId);
    const messagesRef = collection(chatDocRef, 'messages')
    const snapshot = await getDocs(messagesRef);
    if (snapshot.empty) {
      this.channelMessagesExist = false;
    } else {
      this.channelMessagesExist = true;
    }      
  }

  async onSubmit() {
      const message = this.messageForm.value.message?.trim();
      if (!message) return;
      if (this.selectedUser) {         
        this.pushDirectChatMessages();
    } 
    else if (this.selectedChannel) {      
      this.pushChannelMessages();      
    }  
  }

  async pushDirectChatMessages() {
    const sortedIds = [this.shared.actualUser.uid, this.selectedUser?.id].sort(); 
    const chatId = sortedIds.join('_'); 
    const messageText = this.messageForm.value.message ?? ''; 
    const chatDocRef = doc(this.firestore, 'directMessages', chatId);
    const chatSnap = await getDoc(chatDocRef);
    if (!this.chatExists) {
      await setDoc(chatDocRef,{
        chatId: chatId,
      });
    } 
    const messagesRef = collection(this.firestore, 'directMessages', chatId, 'messages');
    await addDoc(messagesRef, {
      user: this.shared.actualUser.uid,
      text: messageText,
      timeStamp: serverTimestamp()
    });      
    this.messageForm.reset();
  }

  async pushChannelMessages() {
    const messageText = this.messageForm.value.message ?? ''; 
    const selectedId = this.selectedChannel?.channelId ?? ''
    if (!this.channelMessagesExist) {   
      const messagesRef = collection(this.firestore, 'channels', selectedId, 'messages');
      await addDoc(messagesRef, {
        user: this.shared.actualUser.uid,
        text: messageText,
        timeStamp: serverTimestamp()
      });   
    } else {  
    const chatDocRef = doc(this.firestore, 'channels', selectedId);
    const messagesRef = collection(chatDocRef, 'messages')
    await addDoc(messagesRef, {
        user: this.shared.actualUser.uid,
        text: messageText,
        timeStamp: serverTimestamp()
      });   
    }
    this.messageForm.reset();
    
  }






}
