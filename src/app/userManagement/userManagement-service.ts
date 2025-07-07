import { Injectable, Input } from '@angular/core';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { User } from "./user.interface";
import { Firestore, doc, updateDoc, addDoc, collection, setDoc, getDoc, onSnapshot } from '@angular/fire/firestore';
import { getAuth, GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, confirmPasswordReset, signInWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged, User as FirebaseUser, signOut, signInAnonymously } from "firebase/auth";
import { NgZone } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { BehaviorSubject } from 'rxjs';

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
    actualUserID: string = "";
    actualUser: any = [];
    actualUser$ = new BehaviorSubject<string>('');
    threadsVisible$ = new BehaviorSubject<boolean>(true);
    private _workspaceOpen = new BehaviorSubject<boolean>(true);
    workspaceOpen$ = this._workspaceOpen.asObservable();
    isDev = true;
    playSlideOut: boolean = false;
    userEditOverlay: boolean = false;
    detailOverlay: boolean = false;
    firebaseFailure: boolean = false;

    constructor(private router: Router, private ngZone: NgZone) { }

    initAuth() {
        onAuthStateChanged(this.auth, (user) => {
            if (user) {
                this.currentUser = user;
                this.actualUserID = user.uid;
                this.actualUser$.next(user.uid);
                this.isAuthenticated = true;

                if (!location.pathname.includes('/main-content')) {
                    this.ngZone.run(() => {
                        this.router.navigate(['/main-content']);
                    });
                }
                this.getActualUser();
            } else {
                this.currentUser = null;
                this.isAuthenticated = false;
                this.actualUser = '';
                this.actualUser$.next('');
                if (!this.isDev) {
                    this.ngZone.run(() => {
                        this.router.navigate(['/login']);
                    });
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
            // Nur diese Zeile, ohne die Zeile darüber
            (this.userDetails as any).uid = uid;
            (this.userDetails as any).displayName = this.userDetails.name;
            (this.userDetails as any).displayNameLowercase = (this.userDetails.name ?? '').toLowerCase();

            const userDocRef = doc(this.firestore, 'users', uid);
            await setDoc(userDocRef, this.userDetails);

            this.infoSlider('accountSuccess');
            await signOut(auth);
            this.ngZone.run(() => {
                this.router.navigate(['/login']);
            });

        } catch (error) {
            this.firebaseFailure = true;
            setTimeout(() => {
                this.firebaseFailure = false;
            }, 3000);
        }
    }

    logInUser(email: string, password: string): Promise<boolean> {
        const auth = this.auth;
        return signInWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                const user = userCredential.user;
                this.actualUserID = user.uid;
                this.inputData = false;
                this.isAuthenticated = true;
                this.updateOnlineStatusOnline();
                return true;
            })
            .catch(() => {
                this.inputData = true;
                return false;
            });
    }

    async logOutUser() {
        await this.updateOnlineStatusOffline();
        const auth = this.auth;
        signOut(auth).then(() => {
            this.isAuthenticated = false
            this.actualUserID = '';
            this.router.navigate(['/login']);
            this.userEditOverlay = false;

        }).catch((error) => {
            this.firebaseFailure = true;
            setTimeout(() => {
                this.firebaseFailure = false;
            }, 3000);
        });
    }

    googleLogIn() {
        const auth = getAuth();
        const provider = new GoogleAuthProvider();
        signInWithPopup(auth, provider)
            .then(async (result) => {
                const credential = GoogleAuthProvider.credentialFromResult(result);
                const token = credential!.accessToken;
                const user = result.user;
                const userDocRef = doc(this.firestore, 'users', user.uid);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    this.actualUserID = user.uid;
                    console.log(this.actualUserID);
                    this.router.navigate(['/main-content']);
                    this.inputData = false;
                    this.isAuthenticated = true;
                } else {
                    await setDoc(userDocRef, {
                        channelIds: {},
                        uid: user.uid,
                        email: user.email,
                        name: user.displayName,
                        picture: 'assets/img/avatar-placeholder.svg',
                        status: false,
                        displayName: user.displayName,
                        displayNameLowercase: (user.displayName ?? '').toLowerCase()
                    });
                    this.router.navigate(['/main-content']);
                }
                this.ngZone.run(() => {
                    this.router.navigate(['/main-content']);
                });
                this.updateOnlineStatusOnline();
            }).catch((error) => {
                this.firebaseFailure = true;
                setTimeout(() => {
                    this.firebaseFailure = false;
                }, 3000);
            });
    }

    guestLogIn() {
        const auth = getAuth();
        signInAnonymously(auth)
            .then(async (result) => {
                const user = result.user;
                const userDocRef = doc(this.firestore, 'users', user.uid);
                const userDocSnap = await getDoc(userDocRef);
                await setDoc(userDocRef, {
                    channelIds: {},
                    uid: user.uid,
                    email: "",
                    name: 'Gast',
                    picture: 'assets/img/avatar-placeholder.svg',
                    status: true,
                    guest: true,
                    displayName: 'Gast',
                    displayNameLowercase: 'gast'
                });

            })
            .catch((error) => {
                this.firebaseFailure = true;
                setTimeout(() => {
                    this.firebaseFailure = false;
                }, 3000);
            });
        this.router.navigate(['/main-content']);
    }

    changePasswordMail(email: string) {
        const auth = this.auth;
        sendPasswordResetEmail(auth, email)
            .then(() => {
                this.router.navigate(['/login']);
                this.infoSlider('resetMailSend');
            })
            .catch((error) => {
                this.firebaseFailure = true;
                setTimeout(() => {
                    this.firebaseFailure = false;
                }, 3000);
            });
    }

    updatePassword(actionCode: string, newPassword: any) {
        console.log('hallo');
        const auth = this.auth;
        confirmPasswordReset(auth, actionCode, newPassword).then((resp) => {
            this.infoSlider('passwordChanged');
            this.router.navigate(['/login']);
        }).catch((error) => {
            this.firebaseFailure = true;
            setTimeout(() => {
                this.firebaseFailure = false;
            }, 3000);
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

    getActualUser() {
        const unsub = onSnapshot(doc(this.firestore, "users", this.actualUserID), (doc) => {
            this.actualUser = doc.data()
        });
    }

    async updateName(newName: string) {
        const currentUser = doc(this.firestore, "users", this.actualUserID);
        await updateDoc(currentUser, {
            name: newName
        });
    }

    async updateOnlineStatusOnline() {
        const currentUser = doc(this.firestore, "users", this.actualUserID);
        await updateDoc(currentUser, {
            status: true
        });
    }

    async updateOnlineStatusOffline() {
        const currentUser = doc(this.firestore, "users", this.actualUserID);
        await updateDoc(currentUser, {
            status: false
        });
    }

    showUserEdit() {
        this.userEditOverlay = !this.userEditOverlay
    }

    userDetailOverlay() {
        this.detailOverlay = !this.detailOverlay
    }

    toggleWorkspace() {
        this._workspaceOpen.next(!this._workspaceOpen.value);
    }

    get workspaceOpen(): boolean {
        return this._workspaceOpen.value;
    }

    openThreads() {
        this.threadsVisible$.next(true);
    }

    closeThreads() {
        this.threadsVisible$.next(false);
    }
}