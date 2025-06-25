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
  @ViewChild('title') title: ElementRef | undefined;
  private animationPlayer: AnimationPlayer | undefined;
  private animationBuilder = inject(AnimationBuilder);

  constructor() { }

  ngAfterViewInit() {
    if (this.logo?.nativeElement) {
      const factory = this.animationBuilder.build([
        style({ transform: 'translateX(0%)' }),
        animate('0.5s 1s ease-in-out', style({ transform: 'translateX(-100%)' }))
      ]);
      this.animationPlayer = factory.create(this.logo.nativeElement);
      this.animationPlayer.play();
      setTimeout(() => {
        this.animateText();
      }, 1500);
    }
  }

  animateText() {
    if (this.title?.nativeElement) {
      const factory = this.animationBuilder.build([
        style({ transform: 'translateX(-100%)' }),
        animate('0.5s ease-in-out', style({ transform: 'translateX(0%)' }))
      ]);
      this.animationPlayer = factory.create(this.title.nativeElement);
      this.animationPlayer.play();
    }
  }
}
