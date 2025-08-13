/**
 * ChangePasswordComponent
 * ------------------------
 * This component allows users to reset their password using an "oobCode" received via email.
 * It uses Angular Reactive Forms for input validation and communicates with a user service
 * to perform the password update.
 */

import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { UserSharedService } from '../userManagement-service';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';; '@angular/core';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CommonModule,
    RouterModule,
  ],
  templateUrl: './change-password.component.html',
  styleUrl: './change-password.component.scss'
})
export class ChangePasswordComponent {
  actionCode: string = "";
  passwordError: boolean = false;
  newPasswordForm = new FormGroup({
    password: new FormControl('', [Validators.required, Validators.minLength(6)]),
    passwordConfirm: new FormControl('', [Validators.required, Validators.minLength(6)]),
  });

  constructor(
    public shared: UserSharedService,
    private route: ActivatedRoute
  ) {
    this.route.queryParams.subscribe(params => {
      this.actionCode = params['oobCode'];
    });
  }

  /**
   * Checks if both passwords match and the form is valid.
   * Used to enable the submit action only when inputs are correct.
   */
  get allInputsChecked() {
    const password = this.newPasswordForm.value.password;
    const passwordConfirm = this.newPasswordForm.value.passwordConfirm
    return password === passwordConfirm && this.newPasswordForm.valid
  }

  /**
   * Handles the password change form submission.
   * If the form is valid and passwords match, triggers the password update service.
   * Otherwise, sets a flag to show an error message.
   */
  onSubmit() {
    if (this.allInputsChecked) {
      const newPassword = this.newPasswordForm.value.password;
      this.shared.updatePassword(this.actionCode, newPassword);
    } else {
      this.passwordError = true;
    }
  }
}