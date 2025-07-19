import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable()
export class MentionService {
  trigger$ = new BehaviorSubject<'@' | '#' | null>(null);
  query$ = new BehaviorSubject<string>('');
  showOverlay$ = new BehaviorSubject<boolean>(false);
  position$ = new BehaviorSubject<DOMRect | null>(null);

  reset() {
    this.trigger$.next(null);
    this.query$.next('');
    this.showOverlay$.next(false);
    this.position$.next(null);
  }
}