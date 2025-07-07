import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { NgForm } from '@angular/forms';

@Component({
  selector: 'app-submit-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './submit-button.component.html',
  styleUrl: './submit-button.component.scss'
})
export class SubmitButtonComponent {
  @Input() form!: NgForm;
  @Input() label: string = 'Save';
}