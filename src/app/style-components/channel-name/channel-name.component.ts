import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-channel-name',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './channel-name.component.html',
  styleUrls: ['./channel-name.component.scss']
})
export class ChannelNameComponent {
  @Input() control!: FormControl<string>;
  @Input() channelExistsError: boolean = false;
  @Input() allowEditName: boolean = false;
  @Input() validationUntouched: boolean = false;
  @Output() saveName = new EventEmitter<void>();
}