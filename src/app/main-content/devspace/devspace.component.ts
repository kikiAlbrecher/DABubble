import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, EventEmitter, inject, Output, ViewChild } from '@angular/core';
import { MentionComponent } from '../../search/mention/mention.component';
import { User } from '../../userManagement/user.interface';
import { Channel } from '../../../models/channel.class';
import { Subscription } from 'rxjs';
import { Firestore } from '@angular/fire/firestore';
import { ChannelSharedService } from '../../channel-management/channel-shared.service';
import { UserSharedService } from '../../userManagement/userManagement-service';
import { MentionUtilsService } from '../../search/mention-utils.service';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { DevspaceService } from './devspace.service';
import { MentionHandlerService } from '../../search/mention-handler.service';

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
  private channelsSub?: Subscription;
  private eRef = inject(ElementRef);
  private savedRange: Range | null = null;
  public editorNativeElement?: HTMLElement;
  public placeholderQuote: string = 'An: #channel, @jemand oder E-Mail-Adresse';
  public isEditorEmpty = true;

  @ViewChild('editor', { static: false }) editor!: ElementRef<HTMLDivElement>;
  @ViewChild(MentionComponent) mentionComponent?: MentionComponent;
  @Output() selectUser = new EventEmitter<User>();
  @Output() selectChannel = new EventEmitter<Channel>();

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
        this.editor.nativeElement.innerHTML = '';
        this.devspaceService.setEditorRef(this.editor);
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
  }

  onEditorKeyDown(event: KeyboardEvent) {
    MentionUtilsService.handleEditorKeyDown(event, this.editor.nativeElement, this.messageForm.controls['message']);
  }

  onContentInput() {
    const sel = window.getSelection();
    const pre = MentionUtilsService.getTextBeforeCursor(this.editor.nativeElement, sel);
    const textContent = this.editor.nativeElement.textContent?.trim() ?? '';
    const match = pre.match(/(?:^|\s)([@#])(\w*)$/);

    this.isEditorEmpty = textContent.length === 0;

    if (match) {
      this.mentionComponent?.mentionService.trigger$.next(match[1] as '@' | '#');
      this.mentionComponent?.mentionService.query$.next(match[2]);
      this.mentionComponent?.mentionService.showOverlay$.next(true);
    } else {
      this.mentionComponent?.mentionService.reset();
    }

    MentionUtilsService.syncEditorToForm(this.editor.nativeElement, this.messageForm.controls['message']);
  }

  private removeMentionsFromDOM(): string {
    return MentionUtilsService.removeMentionsFromElement(this.editor.nativeElement);
  }
}
