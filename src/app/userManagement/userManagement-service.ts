import { Injectable, Input } from '@angular/core';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { User } from "./user.interface";
import { Firestore, doc, updateDoc, addDoc, collection, setDoc } from '@angular/fire/firestore';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, User as FirebaseUser, signOut } from "firebase/auth";


@Injectable({
  providedIn: 'root'
})

export class UserSharedService {
    firestore = inject(Firestore);
    accountSuccess: boolean = false;
    userDetails: Partial<User> = {};
    inputData: boolean = false; 
    currentUser: FirebaseUser | null = null;
    isAuthenticated: boolean = true;
    actualUser:string = "";
    isDev = true;

    constructor(private router: Router) {
        const auth = getAuth();
        onAuthStateChanged(auth, (user) => {
        if (user) {
            this.currentUser = user;
            this.actualUser = user.uid;
            this.isAuthenticated = true;
            setTimeout(() => {
                this.router.navigate(['/main-content']);   
            }, 500);              
        } else {
            this.currentUser = null;
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
        this.accountSuccess = true;
        setTimeout(() => {
            this.accountSuccess = false;
        }, 3000);
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
            console.log('hat geklappt' + userCredential.user.uid);
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
        }).catch((error) => {
            //...
        });
    }



}