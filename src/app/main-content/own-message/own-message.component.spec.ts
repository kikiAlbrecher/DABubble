import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OwnMessageComponent } from './own-message.component';

describe('OwnMessageComponent', () => {
  let component: OwnMessageComponent;
  let fixture: ComponentFixture<OwnMessageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OwnMessageComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(OwnMessageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
