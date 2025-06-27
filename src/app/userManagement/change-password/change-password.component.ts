import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { UserSharedService } from '../userManagement-service';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';;'@angular/core';
import { getAuth } from "firebase/auth";

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
  actionCode: string  = "";
  
  constructor(
      public shared: UserSharedService,
      private route: ActivatedRoute
    ) {
      this.route.queryParams.subscribe(params => {
      this.actionCode = params['oobCode'];
      });    
    }   

    passwordError: boolean = false;
      
    newPasswordForm = new FormGroup({
        password: new FormControl('', [Validators.required, Validators.minLength(6)]),
        passwordConfirm: new FormControl('', [Validators.required, Validators.minLength(6)]),
      });

    get allInputsChecked() {
      const password = this.newPasswordForm.value.password;
      const passwordConfirm = this.newPasswordForm.value.passwordConfirm
      return password === passwordConfirm && this.newPasswordForm.valid
    }   

    onSubmit() {      
      if (this.allInputsChecked) {
        const newPassword = this.newPasswordForm.value.password;
        this.shared.updatePassword(this.actionCode, newPassword);        
      } else {
        this.passwordError = true;
      }

    }
}

