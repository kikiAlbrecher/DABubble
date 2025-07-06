import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogAddChannelMemberComponent } from './dialog-add-channel-member.component';

describe('DialogAddChannelMemberComponent', () => {
  let component: DialogAddChannelMemberComponent;
  let fixture: ComponentFixture<DialogAddChannelMemberComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogAddChannelMemberComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DialogAddChannelMemberComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
