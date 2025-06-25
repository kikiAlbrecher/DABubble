import { Routes } from '@angular/router';
import { AppComponent } from './app.component';
import { LoginComponent } from './userManagement/login/login.component';

export const routes: Routes = [
    { path: '', redirectTo: 'login', pathMatch: 'full' },
    { path: 'login', component: LoginComponent },
];
