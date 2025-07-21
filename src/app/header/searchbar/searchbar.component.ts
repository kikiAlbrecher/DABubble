import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, EventEmitter, inject, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { MentionComponent } from '../../search/mention/mention.component';
import { Firestore, collection, onSnapshot } from '@angular/fire/firestore';
import { UserSharedService } from '../../userManagement/userManagement-service';
import { User } from '../../userManagement/user.interface';
import { Subscription } from 'rxjs';
import { Channel } from '../../../models/channel.class';
import { MentionUtilsService } from '../../search/mention-utils.service';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { SearchService } from './search.service';
import { ChatMessage } from '../../main-content/message.model';
import { SearchResult } from '../../../models/search.class';
import { ChannelSharedService } from '../../channel-management/channel-shared.service';

@Component({
    selector: 'app-searchbar',
    standalone: true,
    imports: [CommonModule, MentionComponent],
    templateUrl: './searchbar.component.html',
    styleUrl: './searchbar.component.scss'
})
export class SearchbarComponent implements OnInit, OnDestroy, AfterViewInit {
    users: User[] = [];
    channels: Channel[] = [];
    results: SearchResult[] = [];
    showSuggestions: boolean = false;
    messageForm = new FormGroup({
        message: new FormControl('', [Validators.required]),
    });
    mentionContext: 'none' | 'user' | 'channel' = 'none';
    mentionCompleted: boolean = false;

    public searchService = inject(SearchService);
    private firestore = inject(Firestore);
    public sharedUsers = inject(UserSharedService);
    public channelService = inject(ChannelSharedService);
    private usersSub?: Subscription;
    private channelsSub?: Subscription;
    private eRef = inject(ElementRef);
    private savedRange: Range | null = null;
    public editorNativeElement?: HTMLElement;
    public placeholderQuote: string = 'Devspace durchsuchen';
    public isEditorEmpty = true;

    @ViewChild('editor', { static: false }) editor!: ElementRef<HTMLDivElement>;
    @ViewChild(MentionComponent) mentionComponent?: MentionComponent;
    @Output() resultSelected = new EventEmitter<SearchResult>();

    ngOnInit() {
        this.channelService.subscribeValidChannels();

        this.channelsSub = this.channelService.allValidChannels$.subscribe(channels => {
            this.channels = channels;
        });

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
        this.channelsSub?.unsubscribe();
    }

    onMentionSelected(name: string) {
        if (name.startsWith('@')) {
            this.mentionContext = 'user';
        } else if (name.startsWith('#')) {
            this.mentionContext = 'channel';
        }
        this.mentionCompleted = true;

        this.mentionComponent?.insertMention(name);

        if (this.editor) {
            MentionUtilsService.syncEditorToForm(this.editor.nativeElement, this.messageForm.controls['message']);
        }
    }

    async onContentInput() {
        const sel = window.getSelection();
        const editorEl = this.editor.nativeElement;
        const pre = MentionUtilsService.getTextBeforeCursor(editorEl, sel);
        const textContent = editorEl.textContent?.trim() ?? '';
        const match = pre.match(/(?:^|\s)([@#])(\w*)$/);

        this.isEditorEmpty = textContent.length === 0;

        if (this.handleSingleTrigger(textContent)) return;
        if (this.handleOngoingTrigger(match)) return;
        if (await this.handleMentionedSearch(editorEl)) return;

        await this.handleGlobalSearch(textContent);
    }

    private handleSingleTrigger(text: string): boolean {
        if (text.length === 1 && ['@', '#'].includes(text)) {
            this.mentionComponent?.mentionService.trigger$.next(text as '@' | '#');
            this.mentionComponent?.mentionService.query$.next('');
            this.mentionComponent?.mentionService.showOverlay$.next(true);
            this.resetMentionState();
            return true;
        }
        return false;
    }

    private handleOngoingTrigger(match: RegExpMatchArray | null): boolean {
        if (match) {
            this.mentionComponent?.mentionService.trigger$.next(match[1] as '@' | '#');
            this.mentionComponent?.mentionService.query$.next(match[2]);
            this.mentionComponent?.mentionService.showOverlay$.next(true);
            this.resetMentionState();
            return true;
        }
        return false;
    }

    private async handleMentionedSearch(editor: HTMLElement): Promise<boolean> {
        const { users, channels, query } = MentionUtilsService.extractMentionsFromEditor(editor);

        if ((users.length > 0 || channels.length > 0) && query.length > 0) {
            this.setMentionContext(users, channels);
            const results = await this.performScopedSearch(query, users, channels);
            this.results = results;
            this.showSuggestions = results.length > 0;
            return true;
        }

        return false;
    }

    private async handleGlobalSearch(text: string): Promise<void> {
        this.mentionContext = 'none';
        this.mentionCompleted = false;

        if (text.length > 0) {
            const results = await this.searchService.search(text);
            this.results = results;
            this.showSuggestions = results.length > 0;
        } else {
            this.showSuggestions = false;
        }
    }

    private resetMentionState() {
        this.showSuggestions = false;
        this.mentionCompleted = false;
        this.mentionContext = 'none';
    }

    private setMentionContext(users: any[], channels: any[]) {
        if (users.length > 0) {
            this.mentionContext = 'user';
        } else if (channels.length > 0) {
            this.mentionContext = 'channel';
        }
        this.mentionCompleted = true;
    }

    private async performScopedSearch(query: string, users: any[], channels: any[]) {
        if (this.mentionContext === 'user') {
            return this.searchService.search(query, users, []);
        } else if (this.mentionContext === 'channel') {
            return this.searchService.search(query, [], channels);
        }
        return [];
    }

    pick(res: SearchResult) {
        this.editor.nativeElement.textContent = res.message.text;
        this.showSuggestions = false;
        this.resultSelected.emit(res);
    }

    onEditorKeyDown(event: KeyboardEvent) {
        MentionUtilsService.handleEditorKeyDown(event, this.editor.nativeElement, this.messageForm.controls['message']);
    }






    // async onSearchClick() {
    //     const rawText = this.editor.nativeElement;
    //     const plainText = MentionUtilsService.extractCleanText(rawText);
    //     const { query, users, channels } = MentionUtilsService.extractMentions(plainText);

    //     const results = await this.searchService.search(query, users, channels);
    //     this.search.emit(results);
    // }
}
