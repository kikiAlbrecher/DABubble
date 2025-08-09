import { inject, Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { UserSharedService } from '../../userManagement/userManagement-service';

@Injectable({
    providedIn: 'root'
})
export class HeaderSharedService {
    editName: boolean = false;
    newName: string = '';
    dropdownProfile: boolean = false;
    newPicture: boolean = false;

    public shared = inject(UserSharedService);
    private profileOpenSubject = new Subject<void>();
    profileOpen$ = this.profileOpenSubject.asObservable();

    requestProfileOpen(): void {
        this.profileOpenSubject.next();
    }

    openProfileOverlay(): void {
        this.dropdownProfile = false;
        this.profileOpenSubject.next();
    }

    /**
     * Toggles the user edit overlay in the header.
     * Prevents the click event from propagating, shows the user edit form,
     * and hides the profile dropdown menu.
     *
     * @param event - The mouse or click event triggering the toggle.
     */
    toggleHeaderOverlay(event: Event): void {
        event.stopPropagation();
        this.shared.showUserEdit();
        this.dropdownProfile = false;
    }

    /**
     * Toggles the visibility of the name editing input.
     * If the edit input is visible, it will be hidden, and vice versa.
     */
    editNameMask(event: Event): void {
        event.stopPropagation();
        this.editName = !this.editName;
        this.newPicture = false;
    }
}