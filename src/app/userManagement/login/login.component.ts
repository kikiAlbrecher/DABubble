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
      private router: Router) {}
    
  logInForm = new FormGroup ({
    email: new FormControl('', Validators.required),
    password: new FormControl('', Validators.required),
    })

  submitLogData() {
    if (this.logInForm.valid) {
      const email = this.logInForm.value.email ?? '';
      const password = this.logInForm.value.password ?? '';
      this.shared.logInUser(email, password);
      this.shared.inputData = false;
    } else {
      this.shared.inputData = true;
    }
  }

}
