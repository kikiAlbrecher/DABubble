import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable()
export class MentionService {
  trigger$ = new BehaviorSubject<'@' | '#' | null>(null);
  query$ = new BehaviorSubject<string>('');
  showOverlay$ = new BehaviorSubject<boolean>(false);
  position$ = new BehaviorSubject<DOMRect | null>(null);

  /**
   * Resets all mention state observables to their default values.
   * This is typically called when the user clears or cancels a mention input.
   */
  reset() {
    this.trigger$.next(null);
    this.query$.next('');
    this.showOverlay$.next(false);
    this.position$.next(null);
  }
}