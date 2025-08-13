/**
 * SignUpComponent
 * ----------------
 * This component handles user registration by collecting name, email, password,
 * and privacy consent using a reactive form. It performs input validation and
 * displays error messages if the user input is invalid.
 *
 * Upon successful form submission, the user details are saved in the shared service
 * and the user is navigated to the avatar selection step.
 *
 */

import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { UserSharedService } from '../userManagement-service';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-sign-up',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule
  ],
  templateUrl: './sign-up.component.html',
  styleUrl: './sign-up.component.scss'
})
export class SignUpComponent {
  constructor(
    public shared: UserSharedService,
    private router: Router) { }

  nameError: boolean = false;
  mailError: boolean = false;
  passwordError: boolean = false;
  privacyError: boolean = false;

  /**
   * Reactive form group to handle user input during sign-up.
   * Fields:
   * - name: required
   * - email: required + must match email format
   * - password: required + minimum length of 6
   * - privacy: must be checked (true)
   */
  signUpForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.minLength(3), Validators.maxLength(15)]),
    email: new FormControl('', [Validators.required, Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}$/)]),
    password: new FormControl('', [Validators.required, Validators.minLength(6)]),
    privacy: new FormControl(false, Validators.requiredTrue)
  });

  /**
   * Resets the input-datafields on pageload
   */
  ngOnInit() {
    this.signUpForm.reset();
  }

  /**
   * Returns true if all inputs pass validation.
   * Used to control form submission.
   */
  get allInputsChecked() {
    return this.signUpForm.valid
  }

  /**
   * Triggered on form submission.
   * Validates each individual field and sets error flags accordingly.
   * If valid, stores the user details in the shared service and redirects to the avatar picker.
   */
  onSubmit() {
    this.nameError = this.signUpForm.controls.name?.invalid ?? false;
    this.mailError = this.signUpForm.controls.email?.invalid ?? false;
    this.passwordError = this.signUpForm.controls.password?.invalid ?? false;
    this.privacyError = this.signUpForm.controls.privacy?.invalid ?? false;
    if (this.signUpForm.valid) {
      this.shared.userDetails = {
        name: this.signUpForm.value.name ?? '',
        email: this.signUpForm.value.email ?? '',
        password: this.signUpForm.value.password ?? '',
        status: false,
        channelIds: { 'ClExENSKqKRsmjb17kGy': true },
        picture: ''
      };
      this.router.navigate(['/pickavatar']);
    }
  }
}