import { Routes } from '@angular/router';
import { AppComponent } from './app.component';
import { LoginComponent } from './userManagement/login/login.component';
import { SignUpComponent } from './userManagement/sign-up/sign-up.component';
import { PickAvatarComponent } from './userManagement/pick-avatar/pick-avatar.component';

export const routes: Routes = [
    { path: '', redirectTo: 'login', pathMatch: 'full' },
    { path: 'login', component: LoginComponent },
    { path: 'signup', component: SignUpComponent },
    { path: 'pickavatar', component: PickAvatarComponent },

];
