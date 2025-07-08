import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SearchForUserComponent } from './search-for-user.component';

describe('SearchForUserComponent', () => {
  let component: SearchForUserComponent;
  let fixture: ComponentFixture<SearchForUserComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchForUserComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SearchForUserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
