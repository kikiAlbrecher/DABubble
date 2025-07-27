import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-close-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './close-button.component.html',
  styleUrl: './close-button.component.scss'
})
export class CloseButtonComponent {
  @Output() close = new EventEmitter<void>();

  /**
   * Emits the close event to signalize the parent component that the close action was triggered.
   */
  onCloseClick() {
    this.close.emit();
  }
}
