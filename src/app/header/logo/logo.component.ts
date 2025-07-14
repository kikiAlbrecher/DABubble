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
  @Input() showMainChatMobile: boolean = false;
  @Output() backToSideNavClick = new EventEmitter<void>();

  backToSideNav() {
    this.backToSideNavClick.emit();
  }
}