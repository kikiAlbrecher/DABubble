import { Component, Input } from '@angular/core';
import { UserSharedService } from '../../userManagement/userManagement-service';
import { MessageSharedService } from '../message-service';
import { ChatMessage } from '../message.model';
import { CommonModule, DatePipe } from '@angular/common';

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
  userName: string = '';
  userPicture: string = '';
  editOverlay: boolean = false;
  
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

  answerMessage() {
    this.sharedUser.threadsVisible$.next(true);
    this.sharedMessages.getAnswerMessage(this.message);
  }

}
