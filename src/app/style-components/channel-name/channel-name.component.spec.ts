import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChannelNameComponent } from './channel-name.component';

describe('ChannelNameComponent', () => {
  let component: ChannelNameComponent;
  let fixture: ComponentFixture<ChannelNameComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChannelNameComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ChannelNameComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
