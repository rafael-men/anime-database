import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Follow } from '../../domain/models/follow.model';
import { User } from '../../domain/models/user.model';
import { ValidationException } from '../exceptions/validation.exception';
import { ResourceNotFoundException } from '../exceptions/resource-not-found.exception';

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
}
