import { Component, Input, HostListener, ElementRef, OnInit } from '@angular/core';
import { UserSharedService } from '../../userManagement/userManagement-service';
import { MessageSharedService } from '../message-service';
import { ChatMessage } from '../message.model';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-own-message',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    FormsModule,
    ReactiveFormsModule

  ],
  templateUrl: './own-message.component.html',
  styleUrl: './own-message.component.scss'
})
export class OwnMessageComponent {
  @Input() message!: ChatMessage;
  editOverlay: boolean = false;
  editMessageOverlay: boolean = false;
  showEditContainer:boolean = false;
  newMessage: string = "";
  

  constructor(
      public sharedUser: UserSharedService,
      public sharedMessages: MessageSharedService,
      private elementRef: ElementRef
    ) {}

  updateMessage = new FormGroup<{ activeMessage: FormControl<string> }>({
      activeMessage: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
  });

  ngOnInit(): void {
    if (this.message) {
      this.updateMessage.patchValue({ activeMessage: this.message.text });
    }
  }

  showEditMessageOverlay() {
    this.editMessageOverlay = !this.editMessageOverlay;
  }

  @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent) {
    const clickedInsideComponent = this.elementRef.nativeElement.contains(event.target);
    if (!clickedInsideComponent) {
    this.editMessageOverlay = false;
    }
  } 

  onMouseOver() {
  if (!this.showEditContainer) {
    this.editOverlay = true;
  }
}

  showEditOverlay() {
    this.showEditContainer = !this.showEditContainer
    this.editMessageOverlay = false;
  }

  abortUpdate() {
    this.showEditContainer = !this.showEditContainer
  }

  onSubmit () {
    this.newMessage = this.updateMessage.value.activeMessage ?? '';
    this.sharedMessages.updateMessage(this.message, this.newMessage);
    this.showEditContainer = false;   
  }

  answerMessage() {
    this.sharedUser.threadsVisible$.next(true);
  }
}
