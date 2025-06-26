
import { Injectable, Input } from '@angular/core';
import { inject } from '@angular/core';
import { User } from "./user.interface";
import { Firestore, doc, updateDoc, addDoc, collection, setDoc } from '@angular/fire/firestore';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword} from "firebase/auth";


@Injectable({
  providedIn: 'root'
})

export class UserSharedService {

    firestore = inject(Firestore);

    accountSuccess: boolean = false;

    userDetails: Partial<User> = {};
    user = {
        email : 'mail@mail1.de',
        password: '123456'
    }

    inputData: boolean = false; 
    
    sendData() {
        console.log(this.userDetails);
        this.accountSuccess = true;
        setTimeout(() => {
            this.accountSuccess = false;
        }, 3000);
    }

    async submitUser() {
        const auth = getAuth();
        await createUserWithEmailAndPassword (auth, this.userDetails.email ?? '', this.userDetails.password ?? '')
        .then((userCredential) => {
            const user = userCredential.user;
            this.accountSuccess = true;
            setTimeout(() => {
                this.accountSuccess = false;
            }, 3000);
            const uid = userCredential.user.uid;
            this.userDetails.id = uid;
            const userDocRef = doc(this.firestore, 'users', uid);
            setDoc(userDocRef, this.userDetails);
            })
        .catch((error) => {
            const errorCode = error.code;
            const errorMessage = error.message;
            // ..
            });       
    }

    logInUser(email:string, password:string) {
        const auth = getAuth();
        signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            console.log('hat geklappt' + userCredential.user.uid);
            this.inputData = false;
        })
        .catch(() => {
            this.inputData = true;
        });

    }



}