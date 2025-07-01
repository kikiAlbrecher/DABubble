import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-status-messages',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './status-messages.component.html',
  styleUrl: './status-messages.component.scss'
})
export class StatusMessagesComponent {
  @Input() statusMessageType: 'success' | 'error' = 'success';
  @Input() statusMessage = '';
}