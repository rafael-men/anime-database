import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { UserController } from '../../src/application/controllers/user.controller';
import { UserService } from '../../src/use-cases/user/user.service';
import { UserAnimeActionsService } from '../../src/use-cases/user/user-anime-actions.service';
import { JwtAuthGuard } from '../../src/application/auth/jwt-auth.guard';
import { OwnershipGuard } from '../../src/application/auth/ownership.guard';

const MockGuard: CanActivate = { canActivate: () => true };

describe('UserController', () => {
  let app: INestApplication;

  const userServiceMock = {
    findById: jest.fn(),
    updateProfile: jest.fn(),
    isUsernameAvailable: jest.fn(),
  };

  const userAnimeActionsServiceMock = {
    addAnimeToFavorites: jest.fn(),
    removeAnimeFromFavorites: jest.fn(),
    getUserFavorites: jest.fn(),
    rateAnime: jest.fn(),
    getUserReviews: jest.fn(),
  };

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        { provide: UserService, useValue: userServiceMock },
        {
          provide: UserAnimeActionsService,
          useValue: userAnimeActionsServiceMock,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(MockGuard)
      .overrideGuard(OwnershipGuard)
      .useValue(MockGuard)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });

  it('GET /users/:id/check-username returns availability', async () => {
    userServiceMock.isUsernameAvailable.mockResolvedValue(true);

    const response = await request(app.getHttpServer())
      .get('/users/user-1/check-username')
      .query({ username: 'rafa' })
      .expect(200);

    expect(userServiceMock.isUsernameAvailable).toHaveBeenCalledWith('rafa', 'user-1');
    expect(response.body).toEqual({ available: true });
  });

  it('GET /users/:id/check-username returns taken when username is in use', async () => {
    userServiceMock.isUsernameAvailable.mockResolvedValue(false);

    const response = await request(app.getHttpServer())
      .get('/users/user-1/check-username')
      .query({ username: 'rafael' })
      .expect(200);

    expect(response.body).toEqual({ available: false });
  });

  it('GET /users/:id should return a user', async () => {
    userServiceMock.findById.mockResolvedValue({
      id: 'user-1',
      username: 'rafael',
      email: 'rafael@email.com',
    });

    const response = await request(app.getHttpServer())
      .get('/users/user-1')
      .expect(200);

    expect(userServiceMock.findById).toHaveBeenCalledWith('user-1');
    expect(response.body).toEqual(
      expect.objectContaining({ id: 'user-1', username: 'rafael' }),
    );
  });

  it('POST /users/:id/favorites should add anime to favorites', async () => {
    userAnimeActionsServiceMock.addAnimeToFavorites.mockResolvedValue({
      id: 'fav-1',
      userId: 'user-1',
      externalAnimeId: '1',
      status: 'WATCHING',
    });

    const response = await request(app.getHttpServer())
      .post('/users/user-1/favorites')
      .send({ externalAnimeId: '1', status: 'WATCHING' })
      .expect(201);

    expect(
      userAnimeActionsServiceMock.addAnimeToFavorites,
    ).toHaveBeenCalledWith('user-1', '1', 'WATCHING');
    expect(response.body).toEqual(
      expect.objectContaining({ userId: 'user-1', externalAnimeId: '1' }),
    );
  });

  it('DELETE /users/:id/favorites/:animeId should remove a favorite', async () => {
    userAnimeActionsServiceMock.removeAnimeFromFavorites.mockResolvedValue(
      undefined,
    );

    await request(app.getHttpServer())
      .delete('/users/user-1/favorites/1')
      .expect(204);

    expect(
      userAnimeActionsServiceMock.removeAnimeFromFavorites,
    ).toHaveBeenCalledWith('user-1', '1');
  });

  it('GET /users/:id/favorites should return favorites list', async () => {
    userAnimeActionsServiceMock.getUserFavorites.mockResolvedValue([
      {
        id: 'fav-1',
        userId: 'user-1',
        externalAnimeId: '1',
        status: 'WATCHING',
      },
    ]);

    const response = await request(app.getHttpServer())
      .get('/users/user-1/favorites')
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].externalAnimeId).toBe('1');
  });

  it('POST /users/:id/reviews should create a review', async () => {
    userAnimeActionsServiceMock.rateAnime.mockResolvedValue({
      id: 'rev-1',
      userId: 'user-1',
      externalAnimeId: '1',
      rating: 9.5,
      comment: 'Excelente!',
    });

    const response = await request(app.getHttpServer())
      .post('/users/user-1/reviews')
      .send({ externalAnimeId: '1', rating: 9.5, comment: 'Excelente!' })
      .expect(201);

    expect(userAnimeActionsServiceMock.rateAnime).toHaveBeenCalledWith(
      'user-1',
      '1',
      9.5,
      expect.objectContaining({ comment: 'Excelente!' }),
    );
    expect(response.body).toEqual(
      expect.objectContaining({ rating: 9.5, comment: 'Excelente!' }),
    );
  });

  it('GET /users/:id/reviews should return reviews', async () => {
    userAnimeActionsServiceMock.getUserReviews.mockResolvedValue([
      { id: 'rev-1', userId: 'user-1', externalAnimeId: '1', rating: 9.5 },
    ]);

    const response = await request(app.getHttpServer())
      .get('/users/user-1/reviews')
      .expect(200);

    expect(response.body).toHaveLength(1);
  });

  it('POST /users/:id/profile should update profile', async () => {
    userServiceMock.updateProfile.mockResolvedValue({
      id: 'user-1',
      username: 'novo-nome',
      bio: 'nova bio',
    });

    const response = await request(app.getHttpServer())
      .post('/users/user-1/profile')
      .send({ username: 'novo-nome', bio: 'nova bio' })
      .expect(201);

    expect(userServiceMock.updateProfile).toHaveBeenCalledWith('user-1', {
      username: 'novo-nome',
      bio: 'nova bio',
    });
    expect(response.body.username).toBe('novo-nome');
  });
});
