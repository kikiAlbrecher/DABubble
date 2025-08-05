import { Routes } from '@angular/router';
import { LoginComponent } from './userManagement/login/login.component';
import { SignUpComponent } from './userManagement/sign-up/sign-up.component';
import { PickAvatarComponent } from './userManagement/pick-avatar/pick-avatar.component';
import { MainContentComponent } from './main-content/main-content.component';
import { ResetPasswordComponent } from './userManagement/reset-password/reset-password.component';
import { ChangePasswordComponent } from './userManagement/change-password/change-password.component';
import { ImprintComponent } from './legal/imprint/imprint.component';
import { PrivacyComponent } from './legal/privacy/privacy.component';

export const routes: Routes = [
    { path: '', redirectTo: 'login', pathMatch: 'full' },
    { path: 'login', component: LoginComponent },
    { path: 'signup', component: SignUpComponent },
    { path: 'pickavatar', component: PickAvatarComponent },
    { path: 'main-content', component: MainContentComponent },
    { path: 'reset-password', component: ResetPasswordComponent },
    { path: 'change-password', component: ChangePasswordComponent },
    { path: 'impressum', component: ImprintComponent },
    { path: 'datenschutz', component: PrivacyComponent },
];