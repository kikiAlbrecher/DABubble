import { CommonModule } from '@angular/common';
import {
    AfterViewInit, Component, ElementRef, EventEmitter, inject, OnDestroy, OnInit, Output,
    ViewChild
} from '@angular/core';
import { MentionComponent } from '../../search/mention/mention.component';
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
import { MentionHandlerService } from '../../search/mention-handler.service';
import { MessageSharedService } from '../../main-content/message-service';

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
    public sharedUsers = inject(UserSharedService);
    public channelService = inject(ChannelSharedService);
    private mentionHandler = inject(MentionHandlerService);
    public sharedMessages = inject(MessageSharedService);
    private usersSub?: Subscription;
    private channelsSub?: Subscription;
    public editorNativeElement?: HTMLElement;
    public placeholderQuote: string = 'Devspace durchsuchen';
    public isEditorEmpty = true;
    selectedResult: SearchResult | null = null;

    @ViewChild('editor', { static: false }) editor!: ElementRef<HTMLDivElement>;
    @ViewChild(MentionComponent) mentionComponent?: MentionComponent;
    @Output() selectUser = new EventEmitter<User>();
    @Output() selectChannel = new EventEmitter<Channel>();
    @Output() resultSelected = new EventEmitter<SearchResult>();
    @Output() searchMobile = new EventEmitter<void>();
    @Output() mainChatOpened = new EventEmitter<void>();

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

    onMentionSelected(name: string): void {
        this.mentionHandler.handleMentionSelected(
            name,
            this.users,
            this.channels,
            mention => this.mentionComponent?.insertMention(mention),
            user => this.selectUser.emit(user),
            channel => this.selectChannel.emit(channel),
            () => {
                if (this.editor) {
                    MentionUtilsService.syncEditorToForm(this.editor.nativeElement, this.messageForm.controls['message']);
                }
            }
        );
        if (window.innerWidth < 1000) {
            setTimeout(() => {
                this.mainChatOpened.emit();
            });
        }
    }

    onEditorKeyDown(event: KeyboardEvent) {
        MentionUtilsService.handleEditorKeyDown(event, this.editor.nativeElement, this.messageForm.controls['message']);
    }

    async onContentInput() {
        const sel = window.getSelection();
        const editorEl = this.editor.nativeElement;
        const pre = MentionUtilsService.getTextBeforeCursor(editorEl, sel);
        const textContent = editorEl.textContent?.trim() ?? '';
        const match = pre.match(/(?:^|\s)([@#])(\w*)$/);

        this.isEditorEmpty = textContent.length === 0;

        if (this.handleSingleTrigger(textContent)) return;
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
        this.selectedResult = res;
        this.editor.nativeElement.textContent = res.message.text;
        this.showSuggestions = false;
        this.resultSelected.emit(res);
    }

    async onSearchIconClick() {
        const selected = this.selectedResult ?? this.results[0];
        if (!selected) return;

        this.searchMobile.emit();
        const msg = selected.message;
        this.sharedMessages.highlightedMessageId = msg.id;
        setTimeout(() => (this.sharedMessages.highlightedMessageId = null), 2000);

        if (msg.channelId?.includes('_')) return this.handleDirectMessage(msg);

        if (msg.channelId) return this.handleChannelMessage(msg);

        this.clearEditor();
    }

    private async handleChannelMessage(msg: ChatMessage) {
        const channel = this.channels.find(c => c.channelId === msg.channelId);
        if (!channel) return;

        this.selectChannel.emit(channel);
        Object.assign(this.sharedMessages, {
            selectedChannel: channel,
            channelSelected: true,
            userSelected: false
        });
        if (window.innerWidth < 1000) {
            setTimeout(() => {
                this.mainChatOpened.emit();
            });
        }

        await this.sharedMessages.getChannelMessages();
        setTimeout(() => (this.sharedMessages.targetMessageText = msg.text), 300);
    }

    private async handleDirectMessage(msg: ChatMessage) {
        const user = this.users.find(u => u.id === msg.user);
        if (!user) return;

        this.selectUser.emit(user);
        Object.assign(this.sharedMessages, {
            selectedUser: user,
            userSelected: true,
            channelSelected: false
        });

        await this.sharedMessages.getUserMessages();
        setTimeout(() => (this.sharedMessages.targetMessageText = msg.text), 300);
    }

    clearEditor() {
        this.editor.nativeElement.innerText = '';
        this.isEditorEmpty = true;
        this.selectedResult = null;
        this.results = [];
        this.showSuggestions = false;
    }
}
