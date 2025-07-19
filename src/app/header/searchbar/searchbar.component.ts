import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, inject, OnChanges, OnDestroy, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { MentionComponent } from '../../search/mention/mention.component';
import { Firestore, collection, onSnapshot } from '@angular/fire/firestore';
import { UserSharedService } from '../../userManagement/userManagement-service';
import { User } from '../../userManagement/user.interface';
import { Subscription } from 'rxjs';
import { Channel } from '../../../models/channel.class';
import { MentionUtilsService } from '../../search/mention-utils.service';
import { FormControl, FormGroup, Validators } from '@angular/forms';

@Component({
    selector: 'app-searchbar',
    standalone: true,
    imports: [CommonModule, MentionComponent],
    templateUrl: './searchbar.component.html',
    styleUrl: './searchbar.component.scss'
})
export class SearchbarComponent implements OnInit, OnDestroy, AfterViewInit, OnChanges {
    users: User[] = [];
    channels: Channel[] = [];
    placeholderQuote: string = "";
    messageForm = new FormGroup({
        message: new FormControl('', [Validators.required]),
    });

    private firestore = inject(Firestore);
    public sharedUsers = inject(UserSharedService);
    private usersSub?: Subscription;
    private eRef = inject(ElementRef);
    private savedRange: Range | null = null;
    public editorNativeElement?: HTMLElement;

    @ViewChild('editor', { static: false }) editor!: ElementRef<HTMLDivElement>;
    @ViewChild(MentionComponent) mentionComponent?: MentionComponent;

    ngOnInit() {
        this.loadChannels();
        this.sharedUsers.subscribeValidUsers();

        this.usersSub = this.sharedUsers.allValidUsers$.subscribe(users => {
            this.users = users;
        });
    }

    ngAfterViewInit(): void {
        setTimeout(() => {
            if (this.editor?.nativeElement) {
                this.editorNativeElement = this.editor.nativeElement;
                this.editor.nativeElement.innerText = '';
            }
        });
    }

    ngOnDestroy() {
        this.usersSub?.unsubscribe();
    }

    ngOnChanges(changes: SimpleChanges): void {
        this.putPlaceholder();
    }

    loadChannels(): void {
        const channelsCollection = collection(this.firestore, 'channels');

        onSnapshot(channelsCollection, (snapshot) => {
            this.channels = snapshot.docs.map(doc => new Channel(doc.data()))
        });
    }

    onMentionSelected(name: string) {
        this.mentionComponent?.insertMention(name);

        if (this.editor) {
            MentionUtilsService.syncEditorToForm(this.editor.nativeElement, this.messageForm.controls['message']);
        }
    }

    putPlaceholder() {
        this.placeholderQuote = 'Devspace durchsuchen';
    }

    onContentInput() {
        const sel = window.getSelection();
        const pre = MentionUtilsService.getTextBeforeCursor(this.editor.nativeElement, sel);
        const match = pre.match(/(?:^|\s)([@#])(\w*)$/);

        if (match) {
            this.mentionComponent?.mentionService.trigger$.next(match[1] as '@' | '#');
            this.mentionComponent?.mentionService.query$.next(match[2]);
            this.mentionComponent?.mentionService.showOverlay$.next(true);
        } else {
            this.mentionComponent?.mentionService.reset();
        }

        MentionUtilsService.syncEditorToForm(this.editor.nativeElement, this.messageForm.controls['message']);
    }

    onEditorKeyDown(event: KeyboardEvent) {
        MentionUtilsService.handleEditorKeyDown(event, this.editor.nativeElement, this.messageForm.controls['message']);
    }
}


// onMentionSelected(name: string) {
//     this.mentionComponent?.insertMention(name);

//     if (this.editor) {
//       MentionUtilsService.syncEditorToForm(this.editor.nativeElement, this.messageForm.controls['message']);
//     }

//     if (name.startsWith('@')) {
//       const searchName = name.slice(1).toLowerCase();
//       const user = this.users.find(u => (u.displayName || u.name).toLowerCase() === searchName);
//       if (user) {
//         this.selectedUser = user;
//         this.selectedChannel = null;
//         this.selectUser.emit(user);
//       }
//     } else if (name.startsWith('#')) {
//       const searchChannel = name.slice(1).toLowerCase();
//       const channel = this.channels.find(c => c.channelName.replace(/^#/, '').toLowerCase() === searchChannel);
//       if (channel) {
//         this.selectedChannel = channel;
//         this.selectedUser = null;
//         this.selectChannel.emit(channel);
//       }
//     }
//   }