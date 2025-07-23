import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-logo',
  standalone: true,
  imports: [],
  templateUrl: './logo.component.html',
  styleUrl: './logo.component.scss'
})
export class LogoComponent {
  @Input() isMobile: boolean = false;
  @Input() showMainChat: boolean = false;
  @Output() backToSideNavClick = new EventEmitter<void>();

  /**
   * Method called when the back-to-side-nav button is clicked.
   * Emits the `backToSideNavClick` event.
   */
  backToSideNav() {
    this.backToSideNavClick.emit();
  }
}