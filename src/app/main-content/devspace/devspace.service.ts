import { Injectable } from '@angular/core';
import { ElementRef } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DevspaceService {
  private editorRef: ElementRef<HTMLDivElement> | null = null;

  setEditorRef(ref: ElementRef<HTMLDivElement>) {
    this.editorRef = ref;
  }

  getEditorTextContent(): string {
    return this.editorRef?.nativeElement?.textContent?.trim() || '';
  }

  clearEditor() {
    if (this.editorRef) this.editorRef.nativeElement.innerHTML = '';
  }

  isEditorEmpty(): boolean {
    return this.getEditorTextContent().length === 0;
  }

  getEditorNativeElement(): HTMLElement | null {
    return this.editorRef?.nativeElement ?? null;
  }
}