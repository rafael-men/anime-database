import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Not } from 'typeorm';
import { User } from '../../src/domain/models/user.model';
import { DEFAULT_ADULT_REQUEST_STATUS } from '../../src/utils/constants';
import { UserService } from '../../src/use-cases/user/user.service';
import { ValidationException } from '../../src/use-cases/exceptions/validation.exception';

describe('UserService', () => {
  let service: UserService;

  const userRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const baseUser = {
    id: 'user-1',
    username: 'rafael',
    email: 'rafael@email.com',
    passwordHash: 'hash',
    avatarUrl: null,
    bio: null,
    favoriteCharacterIds: null,
    birthDate: null,
    adultContentEnabled: false,
    adultRequestStatus: 'none',
    createdAt: new Date(),
    updatedAt: new Date(),
    usernameUpdatedAt: null,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getRepositoryToken(User), useValue: userRepository },
      ],
    }).compile();

    service = moduleRef.get<UserService>(UserService);
  });

  it('should create a pending adult content request when birthDate is provided', async () => {
    userRepository.findOne.mockResolvedValue({ ...baseUser });
    userRepository.update.mockResolvedValue({ affected: 1 });

    const result = await service.updateProfile('user-1', {
      birthDate: '2000-01-15',
      adultContentEnabled: true,
    });

    expect(result.adultRequestStatus).toBe('pending');
    expect(result.adultContentEnabled).toBe(false);
    expect(result.birthDate).toBe('2000-01-15');
    expect(userRepository.update).toHaveBeenCalledWith('user-1', {
      birthDate: '2000-01-15',
      adultRequestStatus: 'pending',
    });
  });

  it('should submit a pending request using a previously stored birthDate', async () => {
    userRepository.findOne.mockResolvedValue({
      ...baseUser,
      birthDate: '1990-06-20',
    });
    userRepository.update.mockResolvedValue({ affected: 1 });

    const result = await service.updateProfile('user-1', {
      adultContentEnabled: true,
    });

    expect(result.adultRequestStatus).toBe('pending');
    expect(userRepository.update).toHaveBeenCalledWith('user-1', {
      birthDate: '1990-06-20',
      adultRequestStatus: 'pending',
    });
  });

  it('should reject requesting adult content without a birthDate', async () => {
    userRepository.findOne.mockResolvedValue({ ...baseUser });

    await expect(
      service.updateProfile('user-1', { adultContentEnabled: true }),
    ).rejects.toThrow(ValidationException);

    await expect(
      service.updateProfile('user-1', { adultContentEnabled: true }),
    ).rejects.toMatchObject({ errorCode: 'BIRTHDATE_REQUIRED' });
  });

  it('should reject a birthDate in the future', async () => {
    userRepository.findOne.mockResolvedValue({ ...baseUser });

    await expect(
      service.updateProfile('user-1', { birthDate: '2099-01-01' }),
    ).rejects.toMatchObject({ errorCode: 'BIRTHDATE_FUTURE' });
  });

  it('should reject an invalid birthDate', async () => {
    userRepository.findOne.mockResolvedValue({ ...baseUser });

    await expect(
      service.updateProfile('user-1', { birthDate: 'not-a-date' }),
    ).rejects.toMatchObject({ errorCode: 'BIRTHDATE_INVALID' });
  });

  it('should allow disabling adult content and reset the request status', async () => {
    userRepository.findOne.mockResolvedValue({
      ...baseUser,
      adultContentEnabled: true,
      adultRequestStatus: 'approved',
    });
    userRepository.update.mockResolvedValue({ affected: 1 });

    const result = await service.updateProfile('user-1', {
      adultContentEnabled: false,
    });

    expect(result.adultContentEnabled).toBe(false);
    expect(result.adultRequestStatus).toBe('none');
    expect(userRepository.update).toHaveBeenCalledWith('user-1', {
      adultContentEnabled: false,
      adultRequestStatus: 'none',
    });
  });

  it('should approve an adult content request', async () => {
    userRepository.findOne.mockResolvedValue({
      ...baseUser,
      adultRequestStatus: 'pending',
    });
    userRepository.update.mockResolvedValue({ affected: 1 });

    const result = await service.approveAdultRequest('user-1');

    expect(result.adultRequestStatus).toBe('approved');
    expect(result.adultContentEnabled).toBe(true);
    expect(userRepository.update).toHaveBeenCalledWith('user-1', {
      adultRequestStatus: 'approved',
      adultContentEnabled: true,
    });
  });

  it('should deny an adult content request', async () => {
    userRepository.findOne.mockResolvedValue({
      ...baseUser,
      adultRequestStatus: 'pending',
    });
    userRepository.update.mockResolvedValue({ affected: 1 });

    const result = await service.denyAdultRequest('user-1');

    expect(result.adultRequestStatus).toBe('denied');
    expect(result.adultContentEnabled).toBe(false);
    expect(userRepository.update).toHaveBeenCalledWith('user-1', {
      adultRequestStatus: 'denied',
      adultContentEnabled: false,
    });
  });

  it('should list only users with an adult request', async () => {
    userRepository.find.mockResolvedValue([
      { id: 'a', adultRequestStatus: 'pending' },
      { id: 'b', adultRequestStatus: 'approved' },
    ]);

    const result = await service.listAdultRequests(50);

    expect(userRepository.find).toHaveBeenCalledWith({
      where: { adultRequestStatus: Not(DEFAULT_ADULT_REQUEST_STATUS) },
      order: { updatedAt: 'DESC' },
      take: 50,
    });
    expect(result).toHaveLength(2);
  });
});
