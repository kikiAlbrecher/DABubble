import { Component, Input } from '@angular/core';
import { User } from '../../userManagement/user.interface';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-user-image-status',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-image-status.component.html',
  styleUrl: './user-image-status.component.scss'
})
export class UserImageStatusComponent {
  @Input() user!: User;
}