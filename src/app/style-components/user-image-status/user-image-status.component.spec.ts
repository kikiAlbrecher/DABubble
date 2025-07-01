import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserImageStatusComponent } from './user-image-status.component';

describe('UserImageStatusComponent', () => {
  let component: UserImageStatusComponent;
  let fixture: ComponentFixture<UserImageStatusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserImageStatusComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(UserImageStatusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
