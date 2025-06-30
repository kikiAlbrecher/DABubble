import { Injectable, Input } from '@angular/core';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { User } from "./user.interface";
import { Firestore, doc, updateDoc, addDoc, collection, setDoc, getDoc } from '@angular/fire/firestore';
import { getAuth, GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, confirmPasswordReset, signInWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged, User as FirebaseUser, signOut } from "firebase/auth";
import { NgZone } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import {  } from "firebase/auth";


@Injectable({
  providedIn: 'root'
})

export class UserSharedService {
    firestore = inject(Firestore);
    auth = inject(Auth);
    accountSuccess: boolean = false;
    resetMailSend: boolean = false;
    passwordChanged: boolean = false;
    userDetails: Partial<User> = {};
    inputData: boolean = false; 
    currentUser: FirebaseUser | null = null;
    isAuthenticated: boolean = false;
    actualUser:string = "";
    isDev = true;
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
        const auth = this.auth;
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
        const auth = this.auth;
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
        const auth = this.auth;
        signOut(auth).then(() => {
            this.isAuthenticated = false
            this.actualUser = '';
            this.router.navigate(['/login']);
        }).catch((error) => {
            //...
        });
    }

    googleLogIn() {
        const auth = getAuth();
        const provider = new GoogleAuthProvider();
        signInWithPopup(auth, provider)
        .then(async(result) => {
            const credential = GoogleAuthProvider.credentialFromResult(result);
            const token = credential!.accessToken;
            const user = result.user;
            const userDocRef = doc(this.firestore, 'users', user.uid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
                this.actualUser = user.uid;
                this.router.navigate(['/main-content']);
                this.inputData = false;
                this.isAuthenticated = true;             
            } else {
                await setDoc(userDocRef, {
                    channelIds: {},
                    uid: user.uid,
                    email: user.email,
                    name: user.displayName,
                    photoURL: 'assets/img/avatar-placeholder.svg',
                    status: false
                });   
                this.router.navigate(['/main-content']);             
            }            
        }).catch((error) => {
            const credential = GoogleAuthProvider.credentialFromError(error);
        });
        
    }

    changePasswordMail(email:string) {
        const auth = this.auth;
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

    updatePassword(actionCode:string, newPassword:any) {
        console.log('hallo');
        const auth = this.auth;
        confirmPasswordReset(auth, actionCode, newPassword).then((resp) => {
        this.infoSlider('passwordChanged');
        this.router.navigate(['/login']);
        }).catch((error) => {
        // Error occurred during confirmation. The code might have expired or the
        // password is too weak.
        });        
    }

    infoSlider(property: 'accountSuccess' | 'resetMailSend' | 'passwordChanged') {
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