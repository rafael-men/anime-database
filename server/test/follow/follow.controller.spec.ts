import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { FollowController } from '../../src/application/controllers/follow.controller';
import { FollowService } from '../../src/use-cases/follow/follow.service';
import { SessionAuthGuard } from '../../src/application/auth/session-auth.guard';

describe('FollowController', () => {
  let app: INestApplication;

  const followServiceMock = {
    follow: jest.fn(),
    unfollow: jest.fn(),
    isFollowing: jest.fn(),
    getFollowCounts: jest.fn(),
    getFollowers: jest.fn(),
    getFollowing: jest.fn(),
    searchUsers: jest.fn(),
  };

  const mockUser = {
    id: 'user-search',
    username: 'hikari chan',
    avatarUrl: null,
    bio: 'Olá',
    createdAt: new Date(),
    isFollowing: false,
  };

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [FollowController],
      providers: [{ provide: FollowService, useValue: followServiceMock }],
    })
      .overrideGuard(SessionAuthGuard)
      .useValue({
        canActivate: (context: {
          switchToHttp: () => { getRequest: () => Record<string, unknown> };
        }) => {
          context.switchToHttp().getRequest().user = {
            sub: 'sub',
            email: 'email',
            username: 'user',
          };
          return true;
        },
      })
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

  it('POST /follows/:id should follow a user', async () => {
    followServiceMock.follow.mockResolvedValue(undefined);

    await request(app.getHttpServer()).post('/follows/user-2').expect(204);

    expect(followServiceMock.follow).toHaveBeenCalledWith('sub', 'user-2');
  });

  it('DELETE /follows/:id should unfollow a user', async () => {
    followServiceMock.unfollow.mockResolvedValue(undefined);

    await request(app.getHttpServer()).delete('/follows/user-2').expect(204);

    expect(followServiceMock.unfollow).toHaveBeenCalledWith('sub', 'user-2');
  });

  it('GET /follows/:id/check should return follow status', async () => {
    followServiceMock.isFollowing.mockResolvedValue(true);

    const response = await request(app.getHttpServer())
      .get('/follows/user-2/check')
      .expect(200);

    expect(followServiceMock.isFollowing).toHaveBeenCalledWith('sub', 'user-2');
    expect(response.body).toEqual({ isFollowing: true });
  });

  it('GET /follows/search should return matching users', async () => {
    followServiceMock.searchUsers.mockResolvedValue([mockUser]);

    const response = await request(app.getHttpServer())
      .get('/follows/search')
      .query({ q: 'hikari' })
      .expect(200);

    expect(followServiceMock.searchUsers).toHaveBeenCalledWith('hikari', 'sub');
    const body = response.body as Array<{
      username: string;
      isFollowing: boolean;
    }>;
    expect(body).toHaveLength(1);
    expect(body[0].username).toBe('hikari chan');
    expect(body[0].isFollowing).toBe(false);
  });

  it('GET /follows/search should pass empty query when q is missing', async () => {
    followServiceMock.searchUsers.mockResolvedValue([]);

    await request(app.getHttpServer()).get('/follows/search').expect(200);

    expect(followServiceMock.searchUsers).toHaveBeenCalledWith('', 'sub');
  });

  it('GET /follows/:id/counts should return followers and following counts', async () => {
    followServiceMock.getFollowCounts.mockResolvedValue({
      followers: 2,
      following: 5,
    });

    const response = await request(app.getHttpServer())
      .get('/follows/user-1/counts')
      .expect(200);

    expect(followServiceMock.getFollowCounts).toHaveBeenCalledWith('user-1');
    expect(response.body).toEqual({ followers: 2, following: 5 });
  });

  it('GET /follows/:id/followers should return follower users', async () => {
    followServiceMock.getFollowers.mockResolvedValue([mockUser]);

    const response = await request(app.getHttpServer())
      .get('/follows/user-1/followers')
      .expect(200);

    expect(followServiceMock.getFollowers).toHaveBeenCalledWith('user-1');
    expect(response.body).toHaveLength(1);
  });

  it('GET /follows/:id/following should return followed users', async () => {
    followServiceMock.getFollowing.mockResolvedValue([mockUser]);

    const response = await request(app.getHttpServer())
      .get('/follows/user-1/following')
      .expect(200);

    expect(followServiceMock.getFollowing).toHaveBeenCalledWith('user-1');
    expect(response.body).toHaveLength(1);
  });
});
