import { CommonModule } from '@angular/common';
import { Firestore, onSnapshot, collection } from '@angular/fire/firestore';
import { AfterViewInit, Component, ElementRef, EventEmitter, inject, Output, ViewChild } from '@angular/core';
import { MentionComponent } from '../../search/mention/mention.component';
import { User } from '../../userManagement/user.interface';
import { Channel } from '../../../models/channel.class';
import { Subscription } from 'rxjs';
import { ChannelSharedService } from '../../channel-management/channel-shared.service';
import { UserSharedService } from '../../userManagement/userManagement-service';
import { MentionUtilsService } from '../../search/mention-utils.service';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { DevspaceService } from './devspace.service';
import { MentionHandlerService } from '../../search/mention-handler.service';

/**
 * Component for the devspace editor that supports rich text input and mentions
 * of users and channels. Handles syncing editor content to a reactive form,
 * detecting mentions, and triggering mention overlays.
 */
@Component({
  selector: 'app-devspace',
  standalone: true,
  imports: [CommonModule, MentionComponent],
  templateUrl: './devspace.component.html',
  styleUrl: './devspace.component.scss'
})
export class DevspaceComponent implements AfterViewInit {
  users: User[] = [];
  channels: Channel[] = [];
  messageForm = new FormGroup({
    message: new FormControl('', [Validators.required]),
  });

  private firestore = inject(Firestore);
  public sharedUsers = inject(UserSharedService);
  public channelService = inject(ChannelSharedService);
  public devspaceService = inject(DevspaceService);
  private mentionHandler = inject(MentionHandlerService);
  private usersSub?: Subscription;
  public editorNativeElement?: HTMLElement;
  public placeholderQuote: string = 'An: #channel, @jemand oder E-Mail-Adresse';
  public isEditorEmpty = true;

  @ViewChild('editor', { static: false }) editor!: ElementRef<HTMLDivElement>;
  @ViewChild(MentionComponent) mentionComponent?: MentionComponent;
  @Output() selectUser = new EventEmitter<User>();
  @Output() selectChannel = new EventEmitter<Channel>();

  /**
   * Initializes user subscription and loads all available channels.
   * Prepares the input field for writing.
   */
  ngOnInit() {
    this.loadAllChannels();

    this.sharedUsers.subscribeValidUsers();

    this.usersSub = this.sharedUsers.allValidUsers$.subscribe(users => {
      this.users = users;
    });

    this.prepareForEntry();
  }

  /**
   * Called after the view is initialized. Sets editor references and
   * clears previous content.
   */
  ngAfterViewInit(): void {
    setTimeout(() => {
      if (this.editor?.nativeElement) {
        this.editorNativeElement = this.editor.nativeElement;
        this.editor.nativeElement.innerHTML = '';
        this.devspaceService.setEditorRef(this.editor);
      }
    });
  }

  /**
   * Cleans up subscriptions when the component is destroyed.
   */
  ngOnDestroy() {
    this.usersSub?.unsubscribe();
  }

  /**
   * Loads all channels from Firestore and stores them in the local state.
   */
  loadAllChannels(): void {
    const channelsCollection = collection(this.firestore, 'channels');

    onSnapshot(channelsCollection, (snapshot) => {
      this.channels = snapshot.docs.map(doc => new Channel(doc.data()))
    });
  }

  /**
   * Clears the editor content and sets focus to the editor element asynchronously
   * to ensure the DOM is loaded completely.
   */
  private prepareForEntry() {
    if (this.editor?.nativeElement) this.editor.nativeElement.innerHTML = '';
    setTimeout(() => this.editor.nativeElement.focus(), 0);
  }

  /**
   * Handles selection of a mention suggestion and routes it to the
   * appropriate handler depending on type.
   * 
   * @param name - The string name or ID of the selected mention.
   */
  onMentionSelected(name: string): void {
    this.mentionHandler.handleMentionSelected(name, this.users, this.channels,
      mention => this.mentionComponent?.insertMention(mention),
      user => this.selectUser.emit(user),
      channel => this.selectChannel.emit(channel),
      () => {
        if (this.editor) {
          MentionUtilsService.syncEditorToForm(this.editor.nativeElement, this.messageForm.controls['message']);
        }
      }
    );
  }

  /**
   * Detects the type of mention in the given text.
   * 
   * @param text - The editor text to evaluate.
   * @returns The mention type: 'user', 'channel', 'email', or null.
   */
  private detectMentionType(text: string): 'user' | 'channel' | 'email' | null {
    const hasUser = /@\w{1,16}/.test(text);
    const hasChannel = /#\w{1,16}/.test(text);
    const hasEmail = /[\w.-]+@[\w.-]+\.\w{2,}/.test(text);

    if (hasUser && !hasChannel && !hasEmail) return 'user';
    if (hasChannel && !hasUser && !hasEmail) return 'channel';
    if (hasEmail && !hasUser && !hasChannel) return 'email';

    return null;
  }

  /**
   * Triggered when the content of the editor changes. Detects mentions and
   * updates the form control with editor content.
   */
  onContentInput() {
    const sel = window.getSelection();
    const pre = MentionUtilsService.getTextBeforeCursor(this.editor.nativeElement, sel);
    const textContent = this.getTrimmedTextContent();

    this.isEditorEmpty = textContent.length === 0;

    const mentionType = this.detectMentionType(textContent);

    mentionType ? this.foundNoMatch() : this.foundMatch(pre);
    this.syncEditorContent();
  }

  /**
   * Returns the trimmed text content of the editor.
   * 
   * @returns The trimmed plain text from the editor.
   */
  private getTrimmedTextContent(): string {
    return this.editor.nativeElement.textContent?.trim() ?? '';
  }

  /**
   * Resets the mention service state if no valid trigger is found.
   */
  private foundNoMatch() {
    this.mentionComponent?.mentionService.reset();
  }

  /**
   * Checks the text before cursor for valid mention patterns and triggers
   * the overlay if a match is found.
   * 
   * @param pre - The text before the cursor in the editor.
   */
  private foundMatch(pre: string) {
    const match = pre.match(/(?:^|\s)([@#])(\w*)$/);

    if (match) {
      const [_, trigger, query] = match;
      this.mentionComponent?.mentionService.trigger$.next(trigger as '@' | '#');
      this.mentionComponent?.mentionService.query$.next(query);
      this.mentionComponent?.mentionService.showOverlay$.next(true);
    } else this.foundNoMatch();
  }

  /**
   * Syncs the editor's inner HTML content to the reactive form control.
   */
  private syncEditorContent() {
    MentionUtilsService.syncEditorToForm(this.editor.nativeElement, this.messageForm.controls['message']);
  }

  /**
   * Handles key down events inside the editor, including preventing
   * invalid mention characters and syncing content.
   * 
   * @param event - The keyboard event triggered in the editor.
   */
  onEditorKeyDown(event: KeyboardEvent) {
    const textContent = this.editor.nativeElement.textContent?.trim() ?? '';
    const hasMention = this.detectMentionType(textContent);

    if (hasMention && ['@', '#'].includes(event.key)) event.preventDefault();

    MentionUtilsService.handleEditorKeyDown(event, this.editor.nativeElement, this.messageForm.controls['message']);
  }
}