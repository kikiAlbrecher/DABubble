
import { Injectable, Input } from '@angular/core';
import { inject } from '@angular/core';

@Injectable({
  providedIn: 'root'
})

export class UserSharedService {

    accountSuccess: boolean = false;
    
    sendData() {
        this.accountSuccess = true;
        setTimeout(() => {
            this.accountSuccess = false;
        }, 3000);
    }



}