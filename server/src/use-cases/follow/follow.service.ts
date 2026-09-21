import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Follow } from '../../domain/models/follow.model';
import { User } from '../../domain/models/user.model';
import { ValidationException } from '../exceptions/validation.exception';
import { ResourceNotFoundException } from '../exceptions/resource-not-found.exception';

export interface UserFollowSearchItem {
  id: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: Date;
  isFollowing: boolean;
}

@Injectable()
export class FollowService {
  constructor(
    @InjectRepository(Follow)
    private readonly followRepository: Repository<Follow>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async follow(followerId: string, followingId: string): Promise<void> {
    if (followerId === followingId) {
      throw new ValidationException(
        'You cannot follow yourself.',
        'SELF_FOLLOW',
      );
    }

    const [follower, following] = await Promise.all([
      this.userRepository.findOne({ where: { id: followerId } }),
      this.userRepository.findOne({ where: { id: followingId } }),
    ]);

    if (!follower || !following) {
      throw new ResourceNotFoundException('User not found.', 'USER_NOT_FOUND');
    }

    const existing = await this.followRepository.findOne({
      where: { follower: { id: followerId }, following: { id: followingId } },
    });

    if (existing) {
      throw new ValidationException(
        'You are already following this user.',
        'ALREADY_FOLLOWING',
      );
    }

    const follow = this.followRepository.create({
      follower,
      following,
    });
    await this.followRepository.save(follow);
  }

  async unfollow(followerId: string, followingId: string): Promise<void> {
    const result = await this.followRepository.delete({
      follower: { id: followerId },
      following: { id: followingId },
    });

    if (!result.affected) {
      throw new ValidationException(
        'You are not following this user.',
        'NOT_FOLLOWING',
      );
    }
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const count = await this.followRepository.count({
      where: { follower: { id: followerId }, following: { id: followingId } },
    });
    return count > 0;
  }

  async getFollowCounts(userId: string): Promise<{
    followers: number;
    following: number;
  }> {
    const [followers, following] = await Promise.all([
      this.followRepository.count({ where: { following: { id: userId } } }),
      this.followRepository.count({ where: { follower: { id: userId } } }),
    ]);
    return { followers, following };
  }

  async getFollowers(userId: string): Promise<User[]> {
    const follows = await this.followRepository.find({
      where: { following: { id: userId } },
      relations: { follower: true },
      order: { createdAt: 'DESC' },
    });
    return follows.map((f) => f.follower);
  }

  async getFollowing(userId: string): Promise<User[]> {
    const follows = await this.followRepository.find({
      where: { follower: { id: userId } },
      relations: { following: true },
      order: { createdAt: 'DESC' },
    });
    return follows.map((f) => f.following);
  }

  async searchUsers(
    query: string,
    requesterId: string,
  ): Promise<UserFollowSearchItem[]> {
    const term = (query ?? '').trim().toLowerCase();

    if (!term) {
      return [];
    }

    const users = await this.userRepository
      .createQueryBuilder('user')
      .where('LOWER(user.username) LIKE :like', { like: `%${term}%` })
      .andWhere('user.id != :requesterId', { requesterId })
      .orderBy('user.username', 'ASC')
      .take(20)
      .getMany();

    const followingIds = new Set(
      (await this.getFollowing(requesterId)).map((u) => u.id),
    );

    return users.map((u) => ({
      id: u.id,
      username: u.username,
      avatarUrl: u.avatarUrl ?? null,
      bio: u.bio ?? null,
      createdAt: u.createdAt,
      isFollowing: followingIds.has(u.id),
    }));
  }
}
