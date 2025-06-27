import { Injectable, Input } from '@angular/core';
import { inject } from '@angular/core';
import { Router, CanActivate } from '@angular/router';
import { User } from "./user.interface";
import { Firestore, doc, updateDoc, addDoc, collection, setDoc } from '@angular/fire/firestore';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged, User as FirebaseUser, signOut } from "firebase/auth";
import { NgZone } from '@angular/core';
import { Auth } from '@angular/fire/auth';


@Injectable({
  providedIn: 'root'
})

export class UserSharedService {
    firestore = inject(Firestore);
    auth = inject(Auth);
    accountSuccess: boolean = false;
    resetMailSend: boolean = false;
    userDetails: Partial<User> = {};
    inputData: boolean = false; 
    currentUser: FirebaseUser | null = null;
    isAuthenticated: boolean = false;
    actualUser:string = "";
    isDev = false;
    playSlideOut: boolean = false;

    constructor(private router: Router, private ngZone: NgZone) {}

    initAuth() {    
      onAuthStateChanged(this.auth, (user) => {
        if (user) {
            this.currentUser = user;
            this.actualUser = user.uid;
            this.isAuthenticated = true;
            if (!location.pathname.includes('/main-content')) {
            this.router.navigate(['/main-content']);
            }
        } else {
            this.currentUser = null;
            this.isAuthenticated = false;
            if (!this.isDev) {
                this.router.navigate(['/login']);
            }
        }
        });
    }
    
    sendData() {
        console.log(this.userDetails);
        this.accountSuccess = true;
        setTimeout(() => {
            this.accountSuccess = false;
        }, 3000);
    }

    async submitUser() {
    try {
        const auth = getAuth();
        const userCredential = await createUserWithEmailAndPassword(
        auth,
        this.userDetails.email ?? '',
        this.userDetails.password ?? ''
        );
        const user = userCredential.user;
        const uid = user.uid;
        this.userDetails.id = uid;
        const userDocRef = doc(this.firestore, 'users', uid);
        await setDoc(userDocRef, this.userDetails); 
        this.infoSlider('accountSuccess');
        await signOut(auth);
        } catch (error) {
        console.error("Fehler bei Registrierung:", error);
        }
    }

    logInUser(email:string, password:string) {
        const auth = getAuth();
        signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            this.router.navigate(['/main-content']);
            this.actualUser = userCredential.user.uid;
            this.inputData = false;
            this.isAuthenticated = true;
        })
        .catch(() => {
            this.inputData = true;
        });
    }

    logOutUser() {
        const auth = getAuth();
        signOut(auth).then(() => {
            //...
            this.isAuthenticated = false
            this.actualUser = '';
            this.router.navigate(['/login']);
        }).catch((error) => {
            //...
        });
    }

    changePasswordMail(email:string) {
        const auth = getAuth();
        sendPasswordResetEmail(auth, email)
        .then(() => {
        this.router.navigate(['/login']);
        this.infoSlider('resetMailSend');
        })
        .catch((error) => {
            const errorCode = error.code;
            const errorMessage = error.message;
            // ..
        });
    }

    infoSlider(property: 'accountSuccess' | 'resetMailSend') {
        (this as any)[property] = true;
        setTimeout(() => {
            this.playSlideOut = true;
            setTimeout(() => {
             (this as any)[property] = false;
            this.playSlideOut = false; 
            }, 300); 
        }, 3000); 
    }

}