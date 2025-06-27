import { Component, ElementRef, AfterViewInit, EventEmitter, Output, inject, ViewChild } from '@angular/core';
import { AnimationBuilder, AnimationPlayer, style, animate } from '@angular/animations';
import { AppComponent } from '../app.component';

@Component({
  selector: 'app-intro',
  standalone: true,
  imports: [AppComponent],
  templateUrl: './intro.component.html',
  styleUrl: './intro.component.scss'
})
export class IntroComponent implements AfterViewInit {

  @Output() animationDone = new EventEmitter<void>();

  @ViewChild('logo') logo: ElementRef | undefined;
  @ViewChild('title') title: ElementRef | undefined;
  @ViewChild('logocontainer') logocontainer: ElementRef | undefined;
  @ViewChild('wrapper') wrapper!: ElementRef;
  private animationPlayer: AnimationPlayer | undefined;
  private animationBuilder = inject(AnimationBuilder);

  constructor() { }

  ngAfterViewInit() {
    if (this.logo?.nativeElement) {
      const factory = this.animationBuilder.build([
        style({ transform: 'translateX(125%)' }),
        animate('0.5s 1s ease-in-out', style({ transform: 'translateX(25%)' }))
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
      setTimeout(() => {
        this.animateLogoToTopLeft();
        this.animateWrapperBackground();
      }, 1000)
    }
  }

  animateLogoToTopLeft() {
    if (this.logocontainer?.nativeElement) {
      const factory = this.animationBuilder.build([
        style({ top: '40%', left: '33%', transform: 'scale(1)'}),
        animate('0.5s ease-in-out', style({ top: '6%', left: '-5%', transform: 'scale(0.6)' }))
      ]);
      this.animationPlayer = factory.create(this.logocontainer.nativeElement);
      this.animationPlayer.play();
    }
  }

  animateWrapperBackground() {
  const animation = this.animationBuilder.build([
    style({ background: 'linear-gradient(to bottom, #797EF3, #313AE5)' }),
    animate('1s ease-in-out', style({ background: 'transparent' }))
  ]);

  const player = animation.create(this.wrapper.nativeElement);
  player.play();
  setTimeout(() => {
    this.animationDone.emit();
  }, 1000);
}
}
