import { Component, EventEmitter, Output, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { collection, onSnapshot, Firestore } from '@angular/fire/firestore';
import { Channel } from '../../../models/channel.class';

@Component({
  selector: 'app-side-nav',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './side-nav.component.html',
  styleUrl: './side-nav.component.scss'
})
export class SideNavComponent implements OnInit, OnDestroy {
  @Output() addChannel = new EventEmitter<void>();

  workspaceOpen = true;
  showChannels = true;
  channels: Channel[] = [];

  private firestore = inject(Firestore);
  private unsubscribeList?: () => void;

  ngOnInit() {
    this.listenToChannels();
  }

  ngOnDestroy(): void {
    if (this.unsubscribeList) {
      this.unsubscribeList();
    }
  }

  listenToChannels() {
    const channelsRef = collection(this.firestore, 'channels');

    this.unsubscribeList = onSnapshot(channelsRef, snapshot => {
      this.channels = snapshot.docs.map(doc => doc.data() as Channel);
    });
  }

  openDialogAddChannel() {
    this.addChannel.emit();
  }

  toggleWorkspace() {
    this.workspaceOpen = !this.workspaceOpen;
  }

  toggleChannels() {
    this.showChannels = !this.showChannels;
  }
}