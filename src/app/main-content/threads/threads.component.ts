import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { UserSharedService } from '../../userManagement/userManagement-service';
import { MessageSharedService } from '../message-service';

@Component({
  selector: 'app-threads',
  standalone: true,
  imports: [
    CommonModule,
    
  ],
  templateUrl: './threads.component.html',
  styleUrl: './threads.component.scss'
})
export class ThreadsComponent {
  constructor(
      public sharedUser: UserSharedService,
      public sharedMessages: MessageSharedService,
    ) {}


  closeThreads() {
    this.sharedUser.threadsVisible$.next(false);
  }

}
