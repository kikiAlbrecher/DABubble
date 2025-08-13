import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { UserSharedService } from '../../userManagement/userManagement-service';
import { MessageSharedService } from '../message-service';
import { WriteMessageComponent } from "../write-message/write-message.component";
import { ThreadsMainChatComponent } from "../../threads/threads-main-chat/threads-main-chat.component";

@Component({
  selector: 'app-threads',
  standalone: true,
  imports: [
    CommonModule,
    WriteMessageComponent,
    ThreadsMainChatComponent
  ],
  templateUrl: './threads.component.html',
  styleUrl: './threads.component.scss'
})
export class ThreadsComponent {
  actualChannelOrUserName: any = "";

  constructor(
    public sharedUser: UserSharedService,
    public sharedMessages: MessageSharedService,
  ) { }

  /**
   * Closes the threads-window.
   */
  closeThreads() {
    this.sharedUser.threadsVisible$.next(false);
  }
}