import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogAddChannelComponent } from '../dialog-add-channel/dialog-add-channel.component';

@Component({
  selector: 'app-side-nav',
  standalone: true,
  imports: [CommonModule, DialogAddChannelComponent],
  templateUrl: './side-nav.component.html',
  styleUrl: './side-nav.component.scss'
})
export class SideNavComponent {
  @Output() addChannel = new EventEmitter<void>();
  workspaceOpen = true;

  openDialogAddChannel() {
    this.addChannel.emit();
  }

  toggleWorkspace() {
    this.workspaceOpen = !this.workspaceOpen;
  }
}