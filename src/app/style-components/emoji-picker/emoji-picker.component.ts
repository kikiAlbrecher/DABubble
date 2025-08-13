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

  /**
   * Emits the selected emoji to external listeners.
   *
   * @param {string} emoji - The emoji character selected by the user.
   */
  selectEmoji(emoji: string) {
    this.emojiSelected.emit(emoji);
  }
}