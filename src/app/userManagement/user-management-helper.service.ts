import { Injectable } from '@angular/core';
import { UserSharedService } from './userManagement-service';
import { doc, setDoc, updateDoc, getDoc } from '@angular/fire/firestore';
import {
  getAuth, GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, User as FirebaseUser, signOut,
  signInAnonymously
} from "firebase/auth";
import { Router } from '@angular/router';
import { User } from './user.interface';

@Injectable({
  providedIn: 'root'
})
export class UserManagementHelperService {
  constructor(public router: Router) { }

  /**
   * Initiates Google sign-in and processes user data accordingly.
   * 
   * @param context - The UserSharedService instance for accessing state and dependencies.
   */
  async handleGoogleLogin(context: UserSharedService) {
    const auth = getAuth();
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      await this.handleGoogleLoginSuccess(context, result);
    } catch (error) {
      this.handleGoogleLoginFailure(context);
    }
  }

  /**
   * Handles successful Google login.
   * 
   * @param context - The UserSharedService instance.
   * @param result - The result object from the Firebase sign-in process.
   */
  private async handleGoogleLoginSuccess(context: UserSharedService, result: any) {
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential!.accessToken;
    const user = result.user;
    const userDocRef = doc(context.firestore, 'users', user.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) this.handleExistingUser(context, user);
    else await this.createNewUser(context, userDocRef, user);

    context.ngZone.run(() => {
      context.router.navigate(['/main-content']);
    });

    context.updateOnlineStatusOnline();
  }

  /**
   * Updates the service state with existing user data.
   * 
   * @param context - The UserSharedService instance.
   * @param user - The authenticated Firebase user object.
   */
  private handleExistingUser(context: UserSharedService, user: any) {
    context.actualUserID = user.uid;
    context.inputData = false;
    context.isAuthenticated = true;
    context.router.navigate(['/main-content']);
  }

  /**
   * Creates a new user in Firestore after Google sign-in.
   * 
   * @param context - The UserSharedService instance.
   * @param userDocRef - The document reference for the new user.
   * @param user - The Firebase user object.
   */
  private async createNewUser(context: UserSharedService, userDocRef: any, user: any) {
    await setDoc(userDocRef, {
      channelIds: { 'ClExENSKqKRsmjb17kGy': true },
      uid: user.uid,
      email: user.email,
      name: user.displayName,
      picture: 'assets/img/avatar-placeholder.svg',
      status: false,
      displayName: user.displayName
    });

    context.channelMembersChanged$.next();
    context.router.navigate(['/main-content']);
  }

  /**
   * Handles login failure by setting the Firebase failure flag.
   * 
   * @param context - The UserSharedService instance.
   */
  private handleGoogleLoginFailure(context: UserSharedService) {
    context.firebaseFailure = true;

    setTimeout(() => context.firebaseFailure = false, 3000);
  }

  /**
   * Handles the logout process: updates status, signs out and redirects.
   * 
   * @param context - The UserSharedService instance.
   */
  async handleLogout(context: UserSharedService) {
    await context.updateOnlineStatusOffline();

    try {
      await signOut(context.auth);
      this.handlePostSignOut(context);
    } catch {
      this.handleSignOutError(context);
    }
  }

  /**
   * Handles post-logout cleanup and navigation.
   * 
   * @param context - The UserSharedService instance.
   */
  private handlePostSignOut(context: UserSharedService) {
    context.isAuthenticated = false;
    context.actualUserID = '';
    context.router.navigate(['/login']);
    context.userEditOverlay = false;
    localStorage.removeItem('introShown');
  }

  /**
   * Handles errors during sign-out by showing a temporary failure message.
   * 
   * @param context - The UserSharedService instance.
   */
  private handleSignOutError(context: UserSharedService) {
    context.firebaseFailure = true;

    setTimeout(() => context.firebaseFailure = false, 3000);
  }

  /**
   * Initiates anonymous guest login and sets user data.
   * 
   * @param context - The UserSharedService instance.
   */
  async handleGuestLogin(context: UserSharedService) {
    const auth = getAuth();

    try {
      const result = await signInAnonymously(auth);
      await this.handleGuestLoginSuccess(context, result);
    } catch (error) {
      this.handleGuestLoginFailure(context);
    }
  }

  /**
   * Handles success of anonymous login and stores guest user data.
   * 
   * @param context - The UserSharedService instance.
   * @param result - The Firebase authentication result object.
   */
  private async handleGuestLoginSuccess(context: UserSharedService, result: any) {
    const user = result.user;
    const userDocRef = doc(context.firestore, 'users', user.uid);

    await this.setGuestUserData(userDocRef, user);
    context.channelMembersChanged$.next();
    context.router.navigate(['/main-content']);
  }

  /**
   * Stores default data for guest users in Firestore.
   * 
   * @param userDocRef - The Firestore document reference for the guest user.
   * @param user - The Firebase user object.
   * @returns A promise resolving when data is written.
   */
  private setGuestUserData(userDocRef: any, user: any) {
    return setDoc(userDocRef, {
      channelIds: { 'ClExENSKqKRsmjb17kGy': true },
      uid: user.uid,
      email: "",
      name: 'Gast',
      picture: 'assets/img/avatar-placeholder.svg',
      status: true,
      guest: true,
      displayName: 'Gast'
    });
  }

  /**
   * Handles errors during guest login by setting the Firebase failure flag.
   * 
   * @param context - The UserSharedService instance.
   */
  private handleGuestLoginFailure(context: UserSharedService) {
    context.firebaseFailure = true;

    setTimeout(() => context.firebaseFailure = false, 3000);
  }

  /**
   * Updates the current user's name and notifies subscribers.
   * 
   * @param context - The UserSharedService instance.
   * @param newName - The new name to set for the user.
   */
  async updateName(context: UserSharedService, newName: string) {
    const currentUser = doc(context.firestore, 'users', context.actualUserID);

    await updateDoc(currentUser, { name: newName, displayName: newName });

    const updated = {
      ...(context['userDetails'] as User), id: context.actualUserID, name: newName, displayName: newName,
      status: true
    };

    context.updateUserDetails(updated);
  }

  /**
   * Updates the current user's avatar and notifies subscribers.
   * 
   * @param context - The UserSharedService instance.
   * @param picture - The new picture URL.
   */
  async changeAvatar(context: UserSharedService, picture: string) {
    const currentUser = doc(context.firestore, 'users', context.actualUserID);

    await updateDoc(currentUser, { picture: picture });

    const updated = { ...(context['userDetails'] as User), picture: picture, status: true };

    context.updateUserDetails(updated);
  }

  /**
   * Handles user registration flow: creates user, stores details, and logs out.
   * 
   * @param context - The UserSharedService instance.
   */
  async handleSubmitUser(context: UserSharedService) {
    try {
      context.isRegistering = true;
      const userCredential = await this.createUserWithEmail(context);
      const user = userCredential.user;

      this.setUserDetails(context, user);
      await this.saveUserDetailsToFirestore(context, user.uid);

      context.infoSlider('accountSuccess');
      await this.signOutAndRedirect(context);
    } catch (error) {
      this.handleRegistrationError(context);
    } finally {
      context.isRegistering = false;
    }
  }

  /**
   * Creates a new user with email and password.
   * 
   * @param context - The UserSharedService instance.
   * @returns A Promise with the user credentials.
   */
  private createUserWithEmail(context: UserSharedService) {
    return createUserWithEmailAndPassword(
      context.auth,
      context.userDetails.email ?? '',
      context.userDetails.password ?? ''
    );
  }

  /**
   * Sets additional user properties in context after registration.
   * 
   * @param context - The UserSharedService instance.
   * @param user - The Firebase user object.
   */
  private setUserDetails(context: UserSharedService, user: any) {
    const uid = user.uid;

    (context.userDetails as any).uid = uid;
    (context.userDetails as any).displayName = context.userDetails.name;
  }

  /**
   * Saves user data to Firestore.
   * 
   * @param context - The UserSharedService instance.
   * @param uid - The user ID.
   */
  private async saveUserDetailsToFirestore(context: UserSharedService, uid: string) {
    const userDocRef = doc(context.firestore, 'users', uid);

    return await setDoc(userDocRef, context.userDetails);
  }

  /**
   * Signs out the current user and navigates to the login page.
   * 
   * @param context - The UserSharedService instance.
   */
  private async signOutAndRedirect(context: UserSharedService) {
    await signOut(context.auth);
    context.ngZone.run(() => {
      context.router.navigate(['/login']);
    });
  }

  /**
   * Handles errors during registration by setting the Firebase failure flag.
   * 
   * @param context - The UserSharedService instance.
   */
  private handleRegistrationError(context: UserSharedService) {
    context.firebaseFailure = true;

    setTimeout(() => context.firebaseFailure = false, 3000);
  }
}