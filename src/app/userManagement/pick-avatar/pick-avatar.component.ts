import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
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
  constructor(
    public shared: UserSharedService,
    private router: Router) {}

  avatarImg:string = 'assets/img/avatar-placeholder.svg';
  picturePicked: boolean = false;
  noPicturePicked: boolean = false;


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
    this.picturePicked = true;
  }

  onSubmit() {
    if (this.picturePicked) {   
      this.shared.userDetails.picture = this.avatarImg ?? '';
      this.shared.submitUser()
      this.router.navigate(['/login']);    
    } else {
      this.noPicturePicked = true;
    }
  }
 
}
