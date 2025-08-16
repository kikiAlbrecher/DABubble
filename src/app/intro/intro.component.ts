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
  @ViewChild('logoName') logoName: ElementRef | undefined;
  @ViewChild('bgLayer') bgLayer!: ElementRef;
  private animationPlayer: AnimationPlayer | undefined;
  private animationBuilder = inject(AnimationBuilder);
  showLogoNameAnimation = false;

  /**
   * Lifecycle hook called after the component's view has been initialized.
   * Determines the screen size and orientation and triggers the corresponding animation.
   */
  ngAfterViewInit() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const isPortrait = window.matchMedia('(orientation: portrait)').matches;
    if (!isPortrait && width > 1200) {
      this.animationDesktop();
    } else if (!isPortrait && width > 1000 && width <= 1200) {
      this.animationBigTablet();
    } else if (!isPortrait && width <= 1000) {
      this.animationSmallTablet();
    } else if (isPortrait && height < 950) {
      this.animationMobileSmallPortrait();
    } else if (isPortrait && height > 950) {
      this.animationMobileBigPortrait();
    }
  }

  /**
   * Plays the desktop version of the intro animation.
   * Moves and scales the logo container to the top-left corner, then fades out background and animates logo name.
   */
  animationDesktop() {
    if (this.logocontainer?.nativeElement) {
      const moveAndScaleFactory = this.animationBuilder.build([
        style({
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%) scale(1)'
        }),
        animate('0.6s 1s ease-in-out', style({
          top: '76px',
          left: '75px',
          transform: 'scale(0.5)'
        }))
      ]);
      this.animationPlayer = moveAndScaleFactory.create(this.logocontainer.nativeElement);
      this.animationPlayer.play();
      this.animationPlayer.onDone(() => {
        this.animateWrapperBackground();
      });
    }
  }

  /**
   * Plays the big tablet version of the intro animation.
   * Moves and scales the logo container similarly to desktop, but ends with background fade only.
   */
  animationBigTablet() {
    if (this.logocontainer?.nativeElement) {
      const moveAndScaleFactory = this.animationBuilder.build([
        style({
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%) scale(1)'
        }),
        animate('0.6s 1s ease-in-out', style({
          top: '76px',
          left: '75px',
          transform: 'scale(0.5)'
        }))
      ]);
      this.animationPlayer = moveAndScaleFactory.create(this.logocontainer.nativeElement);
      this.animationPlayer.play();
      this.animationPlayer.onDone(() => {
        this.animateWrapperBackgroundWithoutNameAnimation();
      });
    }
  }

  /**
   * Plays the small tablet version of the intro animation.
   */
  animationSmallTablet() {
    if (this.logocontainer?.nativeElement) {
      const moveAndScaleFactory = this.animationBuilder.build([
        style({
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%) scale(1)'
        }),
        animate('0.6s 1s ease-in-out', style({
          top: '25px',
          left: '25px',
          transform: 'scale(0.4)'
        }))
      ]);
      this.animationPlayer = moveAndScaleFactory.create(this.logocontainer.nativeElement);
      this.animationPlayer.play();
      this.animationPlayer.onDone(() => {
        this.animateWrapperBackgroundWithoutNameAnimation();
      });
    }
  }

  /**
   * Plays the small portrait mobile version of the intro animation.
   */
  animationMobileSmallPortrait() {
    if (this.logocontainer?.nativeElement) {
      const moveAndScaleFactory = this.animationBuilder.build([
        style({
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%) scale(1)',
          transformOrigin: 'center center',
          position: 'absolute'
        }),
        animate('0.6s 1s ease-in-out', style({
          top: '49px',
          left: '50%',
          transform: 'translate(-50%, -50%) scale(0.4)',
          transformOrigin: 'center center',
          position: 'absolute'
        }))
      ]);
      this.animationPlayer = moveAndScaleFactory.create(this.logocontainer.nativeElement);
      this.animationPlayer.play();
      this.animationPlayer.onDone(() => {
        this.animateWrapperBackgroundWithoutNameAnimation();
      });
    }
  }

  /**
   * Plays the big portrait mobile version of the intro animation.
   */
  animationMobileBigPortrait() {
    if (this.logocontainer?.nativeElement) {
      const moveAndScaleFactory = this.animationBuilder.build([
        style({
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%) scale(1)'
        }),
        animate('0.6s 1s ease-in-out', style({
          top: '94px',
          left: '50%',
          transform: 'translate(-50%, -50%) scale(0.5)',
          transformOrigin: 'center center',
          position: 'absolute'
        }))
      ]);
      this.animationPlayer = moveAndScaleFactory.create(this.logocontainer.nativeElement);
      this.animationPlayer.play();
      this.animationPlayer.onDone(() => {
        this.animateWrapperBackgroundWithoutNameAnimation();
      });
    }
  }

  /**
   * Fades out the background layer and then plays the logo name animation.
   */
  animateWrapperBackground() {
    const animation = this.animationBuilder.build([
      style({ opacity: 1 }),
      animate('1s ease-in-out', style({ opacity: 0 }))
    ]);
    const player = animation.create(this.bgLayer.nativeElement);
    player.play();
    player.onDone(() => {
      this.animateLogoName();
    });
  }


  /**
   * Fades out the background layer and emits the animationDone event without playing logo name animation.
   */
  animateWrapperBackgroundWithoutNameAnimation() {
    const animation = this.animationBuilder.build([
      style({ opacity: 1 }),
      animate('1s ease-in-out', style({ opacity: 0 }))
    ]);
    const player = animation.create(this.bgLayer.nativeElement);
    player.play();
    player.onDone(() => {
      this.animationDone.emit();
    });
  }

  /**
   * Animates the logo name by fading it in and sliding it from right to left.
   * Emits animationDone event when complete.
   */
  animateLogoName() {
    if (!this.logoName?.nativeElement) {
      this.animationDone.emit();
      return;
    }
    const logoNameAnimation = this.animationBuilder.build([
      style({
        opacity: 0,
        transform: 'translateX(50px)'
      }),
      animate('0.5s ease-in-out', style({
        opacity: 1,
        transform: 'translateX(0)'
      }))
    ]);
    const player = logoNameAnimation.create(this.logoName.nativeElement);
    player.play();
    player.onDone(() => {
      this.animationDone.emit();
    });
  }
}
