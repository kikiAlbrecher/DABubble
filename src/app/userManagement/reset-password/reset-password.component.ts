/**
 * ResetPasswordComponent
 * -----------------------
 * This component handles the password reset request process.
 * Users can enter their email address, and the system sends a password reset link
 * if the input is valid. The form uses reactive validation to ensure a valid email format.
 *
 */
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { UserSharedService } from '../userManagement-service';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';; '@angular/core';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CommonModule,
    RouterModule

  ],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss'
})
export class ResetPasswordComponent {

  constructor(
    public shared: UserSharedService,
    private router: Router) { }

  mailError: boolean = false;

  /**
   * Reactive form for capturing the user's email address.
   * Uses built-in validators: required and email format pattern.
   */
  resetForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}$/)]),
  });

  /**
   * Checks if the form input is valid.
   * Used to control form submission.
   */
  get allInputsChecked() {
    return this.resetForm.valid
  }

  /**
   * Handles the password reset request when the form is submitted.
   * If the email is valid, triggers the password reset email function from the shared service.
   * If invalid, sets a flag to display an error in the UI.
   */
  onSubmit() {
    this.mailError = this.resetForm.controls.email?.invalid ?? false;

    if (this.resetForm.valid) {
      const email = this.resetForm.value.email ?? '';

      this.shared.changePasswordMail(email);
    }
  }
}