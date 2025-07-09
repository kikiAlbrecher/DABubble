import { Component, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-emoji-picker',
  standalone: true,
  imports: [],
  templateUrl: './emoji-picker.component.html',
  styleUrl: './emoji-picker.component.scss'
})
export class EmojiPickerComponent {
  @Output() emojiSelected = new EventEmitter<string>();

   emojis = [
    '👍', '❤️', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙌',
    '😉', '😊', '😇', '🎉', '😍', '🤩', '😘', '😗', '☺️', '😚',
    '😛', '😜', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '👎',
    '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
    '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢',
    '🤧', '🤯', '🥳', '😎', '🤓'
  ];

  selectEmoji(emoji: string) {
    this.emojiSelected.emit(emoji);
  }
}



