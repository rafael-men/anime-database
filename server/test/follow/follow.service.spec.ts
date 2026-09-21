import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FollowService } from '../../src/use-cases/follow/follow.service';
import { Follow } from '../../src/domain/models/follow.model';
import { User } from '../../src/domain/models/user.model';

describe('FollowService', () => {
  let service: FollowService;

  const followRepositoryMock = {
    find: jest.fn(),
  };

  const baseUsers = [
    {
      id: 'u-me',
      username: 'Me',
      email: 'me@x.com',
      avatarUrl: null,
      bio: null,
      createdAt: new Date(),
    },
    {
      id: 'u-hikari',
      username: 'hikari chan',
      email: 'hikari@x.com',
      avatarUrl: 'avatar.png',
      bio: 'Olá',
      createdAt: new Date(),
    },
    {
      id: 'u-sakura',
      username: 'Sakura',
      email: 'sakura@x.com',
      avatarUrl: null,
      bio: 'Sou eu',
      createdAt: new Date(),
    },
  ];

  const userRepositoryMock = {
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        FollowService,
        { provide: getRepositoryToken(Follow), useValue: followRepositoryMock },
        { provide: getRepositoryToken(User), useValue: userRepositoryMock },
      ],
    }).compile();

    service = moduleRef.get<FollowService>(FollowService);
  });

  it('should return an empty list when the query is blank', async () => {
    const result = await service.searchUsers('   ', 'u-me');

    expect(result).toEqual([]);
    expect(userRepositoryMock.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('should search users excluding the requester and attach isFollowing', async () => {
    followRepositoryMock.find.mockResolvedValue([
      { id: 'f1', following: baseUsers[1] },
    ]);

    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([baseUsers[1], baseUsers[2]]),
    };
    userRepositoryMock.createQueryBuilder.mockReturnValue(qb);

    const result = await service.searchUsers('hik', 'u-me');

    expect(qb.where).toHaveBeenCalledWith('LOWER(user.username) LIKE :like', {
      like: '%hik%',
    });
    expect(qb.andWhere).toHaveBeenCalledWith('user.id != :requesterId', {
      requesterId: 'u-me',
    });
    expect(qb.orderBy).toHaveBeenCalledWith('user.username', 'ASC');
    expect(qb.take).toHaveBeenCalledWith(20);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: 'u-hikari',
      username: 'hikari chan',
      avatarUrl: 'avatar.png',
      bio: 'Olá',
      createdAt: baseUsers[1].createdAt,
      isFollowing: true,
    });
    expect(result[1]).toEqual({
      id: 'u-sakura',
      username: 'Sakura',
      avatarUrl: null,
      bio: 'Sou eu',
      createdAt: baseUsers[2].createdAt,
      isFollowing: false,
    });
  });

  it('should not expose email in the search results', async () => {
    followRepositoryMock.find.mockResolvedValue([]);

    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([baseUsers[0]]),
    };
    userRepositoryMock.createQueryBuilder.mockReturnValue(qb);

    const result = await service.searchUsers('me', 'u-me');

    expect(result[0]).not.toHaveProperty('email');
  });
});
