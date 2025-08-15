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

/**
 * Component for message and mention-based search across channels and users.
 * Supports scoped search (user/channel) as well as global search.
 */
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
    selectedResult: SearchResult | null = null;

    public isEditorEmpty: boolean = true;
    public searchService = inject(SearchService);
    public sharedUsers = inject(UserSharedService);
    public channelService = inject(ChannelSharedService);
    private mentionHandler = inject(MentionHandlerService);
    public sharedMessages = inject(MessageSharedService);
    private usersSub?: Subscription;
    private channelsSub?: Subscription;
    public editorNativeElement?: HTMLElement;
    public placeholderQuote: string = 'Devspace durchsuchen';

    @ViewChild('editor', { static: false }) editor!: ElementRef<HTMLDivElement>;
    @ViewChild(MentionComponent) mentionComponent?: MentionComponent;
    @Output() selectUser = new EventEmitter<User>();
    @Output() selectChannel = new EventEmitter<Channel>();
    @Output() resultSelected = new EventEmitter<SearchResult>();
    @Output() searchMobile = new EventEmitter<void>();
    @Output() mainChatOpened = new EventEmitter<void>();

    /** 
     * Initializes subscriptions for valid users and channels.
     */
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

    /**
     * Lifecycle hook that runs after the component's view has been fully initialized.
     * Initializes the editor element and clears any existing content.
     */
    ngAfterViewInit(): void {
        setTimeout(() => {
            if (this.editor?.nativeElement) {
                this.editorNativeElement = this.editor.nativeElement;
                this.editor.nativeElement.innerText = '';
            }
        });
    }

    /**
     * Lifecycle hook that runs on component destruction.
     * Cleans up user and channel subscriptions to avoid memory leaks.
     */
    ngOnDestroy() {
        this.usersSub?.unsubscribe();
        this.channelsSub?.unsubscribe();
    }

    /**
     * Handles the selection of a mention (user or channel) from the mention overlay.
     * Emits the selected entity and inserts the mention into the editor.
     *
     * @param name - The selected mention name (e.g., `@username` or `#channelname`)
     */
    onMentionSelected(name: string): void {
        this.mentionHandler.handleMentionSelected(name, this.users, this.channels,
            mention => this.mentionComponent?.insertMention(mention),
            user => this.selectUser.emit(user),
            channel => this.selectChannel.emit(channel),
            () => {
                if (this.editor) MentionUtilsService.syncEditorToForm(this.editor.nativeElement, this.messageForm.controls['message']);
            }
        );

        if (window.innerWidth < 1000) setTimeout(() => this.mainChatOpened.emit());
    }

    /**
     * Handles keydown events inside the editor (e.g. Enter, Backspace, etc.)
     *
     * @param event - KeyboardEvent triggered in the editor
     */
    onEditorKeyDown(event: KeyboardEvent) {
        MentionUtilsService.handleEditorKeyDown(event, this.editor.nativeElement, this.messageForm.controls['message']);
    }

    /**
     * Handles input changes inside the editor and determines if a search (mention-based or global) should be triggered.
     */
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

    /**
     * Handles the edge case when only a single trigger character (`@` or `#`) is typed.
     *
     * @param text - The current content of the editor
     * @returns True if a mention overlay was triggered, false otherwise
     */
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

    /**
     * Triggers a scoped search if mentions (users or channels) are detected within the editor content.
     *
     * @param editor - The editor DOM element
     * @returns True if a scoped search was performed, false otherwise
     */
    private async handleMentionedSearch(editor: HTMLElement): Promise<boolean> {
        const { users, channels, query } = MentionUtilsService.extractMentionsFromEditor(editor);

        if ((users.length > 0 || channels.length > 0) && query.length > 0) {
            this.setMentionContext(users, channels);
            const results = await this.performScopedSearch(query, users, channels);
            this.results = results;
            this.showSuggestions = results.length > 0;
            return true;
        } else {
            this.results = [];
            this.showSuggestions = false;
        }

        return false;
    }

    /**
     * Executes a global search (not scoped by mentions) when plain text is entered.
     *
     * @param text - The input query from the editor
     */
    private async handleGlobalSearch(text: string): Promise<void> {
        this.mentionContext = 'none';
        this.mentionCompleted = false;

        if (text.length > 0) {
            const results = await this.searchService.search(text);
            this.results = results;
            this.showSuggestions = results.length > 0;
        } else {
            this.results = [];
            this.showSuggestions = false;
        }
    }

    /**
     * Resets the current mention-related state, including hiding suggestions
     * and resetting context flags.
     */
    private resetMentionState() {
        this.showSuggestions = false;
        this.mentionCompleted = false;
        this.mentionContext = 'none';
    }

    /**
     * Sets the mention context based on the presence of mentioned users or channels.
     *
     * @param users - Array of mentioned users
     * @param channels - Array of mentioned channels
     */
    private setMentionContext(users: any[], channels: any[]) {
        if (users.length > 0) this.mentionContext = 'user';
        else if (channels.length > 0) this.mentionContext = 'channel';

        this.mentionCompleted = true;
    }

    /**
     * Performs a scoped search depending on the current mention context.
     *
     * @param query - Search query string
     * @param users - List of user IDs to filter by
     * @param channels - List of channel IDs to filter by
     * @returns Promise resolving to an array of matching search results
     */
    private async performScopedSearch(query: string, users: any[], channels: any[]) {
        if (this.mentionContext === 'user') return this.searchService.search(query, users, []);
        else if (this.mentionContext === 'channel') return this.searchService.search(query, [], channels);

        return [];
    }

    /**
     * Handles the selection of a search result item.
     * Updates the editor with the result's text and emits the result.
     *
     * @param res - The selected `SearchResult` object
     */
    pick(res: SearchResult) {
        this.selectedResult = res;
        this.editor.nativeElement.textContent = res.message.text;
        this.showSuggestions = false;
        this.resultSelected.emit(res);
    }

    /**
     * Handles logic when the search icon is clicked.
     * Emits events, highlights messages, and navigates to the appropriate user or channel.
     */
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

    /**
     * Navigates to the selected channel and loads its messages.
     *
     * @param msg - The chat message containing the target channel ID
     */
    private async handleChannelMessage(msg: ChatMessage) {
        const channel = this.channels.find(c => c.channelId === msg.channelId);
        if (!channel) return;

        this.selectChannel.emit(channel);
        Object.assign(this.sharedMessages, {
            selectedChannel: channel,
            channelSelected: true,
            userSelected: false
        });

        if (window.innerWidth < 1000) setTimeout(() => this.mainChatOpened.emit());
        await this.sharedMessages.getChannelMessages();
        setTimeout(() => (this.sharedMessages.targetMessageText = msg.text), 300);
    }

    /**
     * Navigates to the selected user and loads the direct message thread.
     *
     * @param msg - The chat message containing the user ID
     */
    private async handleDirectMessage(msg: ChatMessage) {
        const user = this.users.find(u => u.id === msg.user);
        if (!user) return;

        this.selectUser.emit(user);
        Object.assign(this.sharedMessages, {
            selectedUser: user,
            userSelected: true,
            channelSelected: false
        });

        if (window.innerWidth < 1000) setTimeout(() => this.mainChatOpened.emit());
        await this.sharedMessages.getUserMessages();
        setTimeout(() => (this.sharedMessages.targetMessageText = msg.text), 300);
    }

    /**
     * Clears the editor content and resets all relevant search states.
     */
    clearEditor() {
        this.editor.nativeElement.innerText = '';
        this.isEditorEmpty = true;
        this.selectedResult = null;
        this.results = [];
        this.showSuggestions = false;
    }
}