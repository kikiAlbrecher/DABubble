import { Injectable, Input } from '@angular/core';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Firestore, doc, updateDoc, addDoc, collection, setDoc, getDoc } from '@angular/fire/firestore';
import { getAuth, GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, confirmPasswordReset, signInWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged, User as FirebaseUser, signOut } from "firebase/auth";
import { NgZone } from '@angular/core';
import { Auth } from '@angular/fire/auth';


@Injectable({
  providedIn: 'root'
})

export class HeaderSharedService {

    
    editName:boolean = false;
    newName:string = "";
    dropdownProfile:boolean = false;
  



    editNameMask() {
        this.editName = !this.editName;
    }

    changeDropdown() {
        this.dropdownProfile = !this.dropdownProfile;
    }
}