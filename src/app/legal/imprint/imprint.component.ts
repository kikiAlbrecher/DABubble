import { Component } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { ChangePasswordComponent } from "../../userManagement/change-password/change-password.component";

@Component({
  selector: 'app-imprint',
  standalone: true,
  imports: [RouterModule, ChangePasswordComponent],
  templateUrl: './imprint.component.html',
  styleUrl: './imprint.component.scss'
})
export class ImprintComponent {
  constructor(
    private router: Router) { }
}