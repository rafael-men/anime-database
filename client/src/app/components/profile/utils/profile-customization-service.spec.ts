import { TestBed } from '@angular/core/testing';

import { ProfileCustomizationService } from './profile-customization-service';

describe('ProfileCustomizationService', () => {
  let service: ProfileCustomizationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProfileCustomizationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
