import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatusMessagesComponent } from './status-messages.component';

describe('StatusMessagesComponent', () => {
  let component: StatusMessagesComponent;
  let fixture: ComponentFixture<StatusMessagesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatusMessagesComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(StatusMessagesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
