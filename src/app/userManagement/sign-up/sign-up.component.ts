import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule, RouterOutlet, Router } from '@angular/router';
import { UserSharedService } from '../userManagement-service';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';;

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
    private router: Router) {}

  nameError: boolean = false;
  mailError: boolean = false;
  passwordError: boolean = false;
  privacyError: boolean = false;  
  signUpForm = new FormGroup({
    name: new FormControl('', [Validators.required]),
    email: new FormControl('', [Validators.required, Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}$/)]),
    password: new FormControl('', [Validators.required, Validators.minLength(6)]),
    privacy: new FormControl(false, Validators.requiredTrue)
  });

  get allInputsChecked() {
    return this.signUpForm.valid
  }

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
        channelIds: [],
        picture: ''
      };
      this.router.navigate(['/pickavatar']);    
    }     
  }

    

}
