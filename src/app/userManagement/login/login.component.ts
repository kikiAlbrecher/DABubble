/**
 * LoginComponent
 * --------------
 * This component provides the login functionality for the application.
 * It uses Angular Reactive Forms to capture and validate user credentials,
 * and interacts with the UserSharedService to authenticate the user.
 *
 * If authentication is successful, the user is redirected to the main content page.
 * If authentication fails or input is invalid, an error state is triggered for UI feedback.
 */

import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { UserSharedService } from '../userManagement-service';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  constructor(
    public shared: UserSharedService,
    private router: Router) { }

  /**
   * Reactive form group for user login inputs.
   * Contains email and password fields, both required.
   */
  logInForm = new FormGroup({
    email: new FormControl('', Validators.required),
    password: new FormControl('', Validators.required),
  })

  /**
   * Resets the input-datafields on pageload
   */
  ngOnInit() {
    this.logInForm.reset();
    this.shared.inputData = false;
  }

  /**
   * Handles form submission for login.
   * If the form is valid, attempts to log the user in via the shared service.
   * On success, navigates to the main content page.
   * On failure, sets the inputData flag to trigger an error message in the UI.
   */
  submitLogData() {
    if (this.logInForm.valid) {
      const email = this.logInForm.value.email ?? '';
      const password = this.logInForm.value.password ?? '';
      this.shared.logInUser(email, password).then(success => {
        if (success) {
          this.shared.inputData = false;
          this.router.navigate(['/main-content']);
        } else this.shared.inputData = true;
      });
    } else this.shared.inputData = true;
  }
}