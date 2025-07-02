import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WriteMessageComponent } from './write-message.component';

describe('WriteMessageComponent', () => {
  let component: WriteMessageComponent;
  let fixture: ComponentFixture<WriteMessageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WriteMessageComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(WriteMessageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
