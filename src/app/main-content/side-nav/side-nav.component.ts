import { Component, EventEmitter, Output, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { collection, onSnapshot, Firestore } from '@angular/fire/firestore';
import { Channel } from '../../../models/channel.class';
import { User } from '../../userManagement/user.interface';

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
  showUsers = true;
  channels: Channel[] = [];
  users: User[] = [];

  private firestore = inject(Firestore);
  private unsubscribeChannels?: () => void;
  private unsubscribeUsers?: () => void;

  ngOnInit() {
    this.listenToChannels();
    this.listenToUsers();
  }

  ngOnDestroy(): void {
    if (this.unsubscribeChannels) this.unsubscribeChannels();
    if (this.unsubscribeUsers) this.unsubscribeUsers();
  }

  listenToChannels() {
    const channelsRef = collection(this.firestore, 'channels');

    this.unsubscribeChannels = onSnapshot(channelsRef, snapshot => {
      this.channels = snapshot.docs.map(doc => doc.data() as Channel);
    });
  }

  listenToUsers() {
    const usersRef = collection(this.firestore, 'users');

    this.unsubscribeUsers = onSnapshot(usersRef, snapshot => {
      this.users = snapshot.docs.map(doc => {
        const data = doc.data() as User;
        data.id = doc.id;
        return data;
      });
    });
  }

  openDialogAddChannel() {
    this.addChannel.emit();
  }

  toggleWorkspace() {
    this.workspaceOpen = !this.workspaceOpen;
  }

  toggleDropDownChannels() {
    this.showChannels = !this.showChannels;
  }

  toggleDropDownUsers() {
    this.showUsers = !this.showUsers;
  }
}