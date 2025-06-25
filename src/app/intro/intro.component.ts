import { Component, ElementRef, AfterViewInit, inject, ViewChild } from '@angular/core';
import { AnimationBuilder, AnimationPlayer, style, animate } from '@angular/animations';

@Component({
  selector: 'app-intro',
  standalone: true,
  imports: [],
  templateUrl: './intro.component.html',
  styleUrl: './intro.component.scss'
})
export class IntroComponent implements AfterViewInit {

  @ViewChild('logo') logo: ElementRef | undefined;
  private animationPlayer: AnimationPlayer | undefined;
  private animationBuilder = inject(AnimationBuilder);

  constructor() { }

  ngAfterViewInit() {
    if (this.logo?.nativeElement) {
      const factory = this.animationBuilder.build([
        style({ transform: 'translateX(0)' }),
        animate('1s 2s ease-in-out', style({ transform: 'translateX(-100px)' }))
      ]);
      this.animationPlayer = factory.create(this.logo.nativeElement);
      this.animationPlayer.play();
    }
  }
}
