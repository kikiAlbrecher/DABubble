import { inject, Injectable } from '@angular/core';
import { UserSharedService } from '../../userManagement/userManagement-service';

@Injectable({
    providedIn: 'root'
})
export class HeaderSharedService {
    editName: boolean = false;
    newName: string = "";
    dropdownProfile: boolean = false;

    public shared = inject(UserSharedService);

    toggleHeaderOverlay(event: Event): void {
        event.stopPropagation();
        this.shared.showUserEdit();
        this.dropdownProfile = false;
    }

    editNameMask() {
        this.editName = !this.editName;
    }

    changeDropdown() {
        this.dropdownProfile = !this.dropdownProfile;
    }
}