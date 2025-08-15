import { Injectable } from '@angular/core';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { User } from "./user.interface";
import { Firestore, doc, updateDoc, getDoc, onSnapshot, collection } from '@angular/fire/firestore';
import {
    confirmPasswordReset, signInWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged, User as FirebaseUser
} from "firebase/auth";
import { NgZone } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { BehaviorSubject } from 'rxjs';
import { Channel } from '../../models/channel.class';
import { UserManagementHelperService } from './user-management-helper.service';

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
    allValidUsers$ = new BehaviorSubject<User[]>([]);
    selectedUser: User | null = null;
    threadsVisible$ = new BehaviorSubject<boolean>(false);
    private _workspaceOpen = new BehaviorSubject<boolean>(true);
    workspaceOpen$ = this._workspaceOpen.asObservable();
    channelListRefresh$ = new BehaviorSubject<void>(undefined);
    lastAddedChannel$ = new BehaviorSubject<Channel | null>(null);
    channelMembersChanged$ = new BehaviorSubject<void>(undefined);
    isDev = true;
    playSlideOut: boolean = false;
    userEditOverlay: boolean = false;
    detailOverlay: boolean = false;
    firebaseFailure: boolean = false;
    isRegistering: boolean = false;
    private _userDetails = new BehaviorSubject<User>({} as User);
    userDetails$ = this._userDetails.asObservable();

    constructor(public router: Router, public ngZone: NgZone, private userHelperService: UserManagementHelperService) { }

    /**
     * Initializes the authentication state listener.
     * Listens for changes in the authentication state and handles user login or logout accordingly.
     */
    initAuth() {
        onAuthStateChanged(this.auth, (user) => {
            if (this.isRegistering) return;

            if (user) {
                this.handleUserLogin(user);
            } else {
                this.handleUserLogout();
            }
        });
    }

    /**
     * Handles the login process when a user is authenticated.
     * Updates current user information, authentication state, and navigates to main content if needed.
     * 
     * @param user - The authenticated user object.
     */
    handleUserLogin(user: any) {
        this.currentUser = user;
        this.actualUserID = user.uid;
        this.actualUser$.next(user.uid);
        this.isAuthenticated = true;

        this.navigateToMainContentIfNeeded();
        this.getActualUser();
    }

    /**
     * Handles the logout process when no user is authenticated.
     * Clears user information and navigates to the login page if not in development mode.
     */
    handleUserLogout() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.actualUser = '';
        this.actualUser$.next('');

        this.navigateToLoginIfNeeded();
    }

    /**
     * Navigates to the main content page if the current path is not already '/main-content'.
     */
    navigateToMainContentIfNeeded() {
        if (!location.pathname.includes('/main-content')) {
            this.ngZone.run(() => this.router.navigate(['/main-content']));
        }
    }

    /**
     * Navigates to the login page if the app is not running in development mode.
     */
    navigateToLoginIfNeeded() {
        if (!this.isDev) this.ngZone.run(() => this.router.navigate(['/login']));
    }

    /**
    * Sends user data, sets accountSuccess flag for UI feedback.
    */
    sendData() {
        this.accountSuccess = true;

        setTimeout(() => this.accountSuccess = false, 3000);
    }

    /**
     * Submits the user registration data by creating an account and saving user details to Firestore.
     */
    async submitUser() {
        await this.userHelperService.handleSubmitUser(this);
    }

    /**
     * Attempts to log in a user with the provided email and password.
     * Updates authentication state and user status upon success.
     * 
     * @param email - The user's email address.
     * @param password - The user's password.
     * @returns A promise that resolves to true if login is successful, otherwise false.
     */
    logInUser(email: string, password: string): Promise<boolean> {
        return signInWithEmailAndPassword(this.auth, email, password)
            .then(userCredential => this.handleSuccessfulLogin(userCredential))
            .catch(() => {
                this.inputData = true;
                return false;
            });
    }

    /**
     * Handles updates and state changes after a successful login.
     * 
     * @param userCredential - The user credential object returned by Firebase.
     * @returns True to indicate successful handling.
     */
    private handleSuccessfulLogin(userCredential: any): boolean {
        const user = userCredential.user;
        this.actualUserID = user.uid;
        this.inputData = false;
        this.isAuthenticated = true;
        this.updateOnlineStatusOnline();
        return true;
    }

    /**
     * Logs out the current user by updating their status and signing out from Firebase.
     */
    async logOutUser() {
        await this.userHelperService.handleLogout(this);
    }

    /**
     * Initiates Google sign-in with a popup and handles user data accordingly.
     */
    googleLogIn() {
        this.userHelperService.handleGoogleLogin(this);
    }

    /**
     * Logs in a user anonymously as a guest.
     */
    guestLogIn() {
        this.userHelperService.handleGuestLogin(this);
    }

    /**
     * Sends a password reset email to the specified email address.
     * On successful sending, navigates the user to the login page and displays a confirmation message.
     * In case of failure, shows an error message for 3 seconds.
     * 
     * @param email - The email address to which the password reset email will be sent.
     */
    changePasswordMail(email: string) {
        const auth = this.auth;

        sendPasswordResetEmail(auth, email)
            .then(() => {
                this.router.navigate(['/login']);
                this.infoSlider('resetMailSend');
            })
            .catch((error) => {
                this.firebaseFailure = true;

                setTimeout(() => this.firebaseFailure = false, 3000);
            });
    }

    /**
     * Confirms the password reset with the provided action code and sets the new password.
     * 
     * @param actionCode - The password reset action code received via email.
     * @param newPassword - The new password to be set for the user.
     * 
     * On success, shows a confirmation message and navigates to the login page.
     * On failure, displays an error message for 3 seconds.
     */
    updatePassword(actionCode: string, newPassword: any) {
        const auth = this.auth;

        confirmPasswordReset(auth, actionCode, newPassword).then((resp) => {
            this.infoSlider('passwordChanged');
            this.router.navigate(['/login']);
        }).catch((error) => {
            this.firebaseFailure = true;

            setTimeout(() => this.firebaseFailure = false, 3000);
        });
    }

    /**
     * Displays an info slider notification based on the specified property.
     * Automatically hides the notification after a delay with an animation.
     * 
     * @param property - The property name controlling the specific notification ('accountSuccess', 'resetMailSend', or 'passwordChanged').
     */
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

    /**
     * Subscribes to real-time updates of the current user's Firestore document.
     * Updates the local actualUser property with the latest data.
     */
    getActualUser() {
        const unsub = onSnapshot(doc(this.firestore, "users", this.actualUserID), (doc) => {
            const data = doc.data();

            if (data) this.actualUser = { ...data, id: doc.id };
        });
    }

    /**
     * Updates the current user's name in Firestore.
     * 
     * @param newName - The new name to set for the user.
     */
    async updateName(newName: string) {
        this.userHelperService.updateName(this, newName);
    }

    /**
     * Updates the current user's picture in Firestore.
     * 
     * @param picture - The new picture to set for the user.
     */
    async changeAvatar(picture: string) {
        this.userHelperService.changeAvatar(this, picture);
    }

    /**
     * Sets the current user's online status to true in Firestore.
     */
    async updateOnlineStatusOnline() {
        const currentUser = doc(this.firestore, "users", this.actualUserID);

        await updateDoc(currentUser, { status: true });
    }

    /**
     * Sets the current user's online status to false in Firestore.
     */
    async updateOnlineStatusOffline() {
        const currentUser = doc(this.firestore, "users", this.actualUserID);

        await updateDoc(currentUser, { status: false });
    }

    /**
     * Toggles the visibility of the user edit overlay.
     */
    showUserEdit() {
        this.userEditOverlay = !this.userEditOverlay;
    }

    /**
     * Toggles the visibility of the user detail overlay.
     */
    userDetailOverlay() {
        this.detailOverlay = !this.detailOverlay;
    }

    /**
     * Toggles the workspace open/close state.
     * Emits the opposite of the current value.
     */
    toggleWorkspace() {
        this._workspaceOpen.next(!this._workspaceOpen.value);
    }

    /**
     * Returns the current state of the workspace (open or closed).
     */
    get workspaceOpen(): boolean {
        return this._workspaceOpen.value;
    }

    /**
     * Makes the threads section visible by emitting `true`.
     */
    openThreads() {
        this.threadsVisible$.next(true);
    }

    /**
     * Hides the threads section by emitting `false`.
     */
    closeThreads() {
        this.threadsVisible$.next(false);
    }

    /**
     * Subscribes to the users collection in Firestore and filters out invalid users.
     * 
     * - Includes all users whose name is not 'Gast'.
     * - Includes guest users only if their `status` is `true`.
     * - Emits the list of valid users via `allValidUsers$`.
     */
    subscribeValidUsers(): void {
        const usersCollection = collection(this.firestore, 'users');

        onSnapshot(usersCollection, (snapshot) => {
            const users: User[] = [];

            snapshot.forEach((docSnap) => {
                const user = docSnap.data() as User;
                const id = docSnap.id;

                if (user.name !== 'Gast' || (user.name === 'Gast' && user.status === true)) users.push({ ...user, id });
            });

            this.allValidUsers$.next(users);
        });
    }

    /**
     * Removes a specific channel ID from a user's list of channel memberships in Firestore.
     * 
     * @param userId - The ID of the user whose channel membership is to be removed.
     * @param channelId - The ID of the channel to remove from the user's list.
     * @throws If the user does not exist in Firestore.
     */
    async removeChannelUser(userId: string, channelId: string): Promise<void> {
        const userDocRef = doc(this.firestore, 'users', userId);
        const userSnap = await getDoc(userDocRef);

        if (!userSnap.exists()) throw new Error('Der Nutzer existiert nicht.');

        const userData = userSnap.data();
        const channelIds: { [channelId: string]: true } = userData['channelIds'] || {};

        if (channelIds.hasOwnProperty(channelId)) delete channelIds[channelId];

        await updateDoc(userDocRef, { channelIds: channelIds });
    }

    /**
     * Sets the user as the currently selected user.
     * 
     * @param user - The user marked as selected one.
     */
    setSelectedUser(user: User) {
        this.selectedUser = user;
    }

    /**
     * Updates the current user details and emits the new value to all subscribers.
     *
     * @param user - The updated user object.
     */
    updateUserDetails(user: User) {
        this.userDetails = user;
        this._userDetails.next(user);
    }
}