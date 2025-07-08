import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogShowChannelMembersComponent } from './dialog-show-channel-members.component';

describe('DialogShowChannelMembersComponent', () => {
  let component: DialogShowChannelMembersComponent;
  let fixture: ComponentFixture<DialogShowChannelMembersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogShowChannelMembersComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DialogShowChannelMembersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
