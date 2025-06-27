import { Routes } from '@angular/router';
import { AppComponent } from './app.component';
import { LoginComponent } from './userManagement/login/login.component';
import { SignUpComponent } from './userManagement/sign-up/sign-up.component';
import { PickAvatarComponent } from './userManagement/pick-avatar/pick-avatar.component';
import { MainContentComponent } from './main-content/main-content.component';
import { ResetPasswordComponent } from './userManagement/reset-password/reset-password.component';

export const routes: Routes = [
    { path: '', redirectTo: 'login', pathMatch: 'full' },
    { path: 'login', component: LoginComponent },
    { path: 'signup', component: SignUpComponent },
    { path: 'pickavatar', component: PickAvatarComponent },
    { path: 'main-content', component: MainContentComponent },
    { path: 'reset-password', component: ResetPasswordComponent }
];
