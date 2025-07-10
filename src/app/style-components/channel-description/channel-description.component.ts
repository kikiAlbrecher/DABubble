import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-channel-description',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './channel-description.component.html',
  styleUrls: ['./../channel-name/channel-name.component.scss', './channel-description.component.scss']
})
export class ChannelDescriptionComponent {
  @Input() control!: FormControl<string>;
  @Input() allowEditDescription: boolean = true;
  @Output() save = new EventEmitter<void>();
}