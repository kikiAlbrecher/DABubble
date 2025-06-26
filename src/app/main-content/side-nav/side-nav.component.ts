import { Component } from '@angular/core';
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
  showAddChannelDialog = false;
  workspaceOpen = true;

  openDialogAddChannel() {
    this.showAddChannelDialog = true;
  }

  handleDialogClose() {
    this.showAddChannelDialog = false;
  }

  handleChannelCreate(name: string) {
    this.showAddChannelDialog = false;
    console.log('new channel:', name);
  }

  toggleWorkspace() {
    this.workspaceOpen = !this.workspaceOpen;
  }
}