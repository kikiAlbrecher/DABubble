import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { UserSharedService } from '../userManagement-service';

@Component({
  selector: 'app-pick-avatar',
  standalone: true,
  imports: [
      CommonModule,
      RouterModule,
  ],
  templateUrl: './pick-avatar.component.html',
  styleUrl: './pick-avatar.component.scss'
})
export class PickAvatarComponent {
  constructor(public shared: UserSharedService) {}

  avatarImg:string = 'assets/img/avatar-placeholder.svg'

  images = [
    'assets/img/avatar1.svg',
    'assets/img/avatar2.svg',
    'assets/img/avatar3.svg',
    'assets/img/avatar4.svg',
    'assets/img/avatar5.svg',
    'assets/img/avatar6.svg',
  ]

  setImage(item:string) {
    this.avatarImg = item;
  }
 
}
