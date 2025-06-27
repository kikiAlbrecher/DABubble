import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule, RouterOutlet, Router } from '@angular/router';
import { UserSharedService } from '../userManagement-service';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';;'@angular/core';

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
    private router: Router) {}

  mailError: boolean = false;
  
  resetForm = new FormGroup({
      email: new FormControl('', [Validators.required, Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}$/)]),
    });
    
  get allInputsChecked() {
    return this.resetForm.valid
  }


  onSubmit() {
    this.mailError = this.resetForm.controls.email?.invalid ?? false;
    if (this.resetForm.valid) {
      const email = this.resetForm.value.email ?? ''
      this.shared.changePasswordMail(email);      
    }
  }
}
