import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { User } from '../../domain/models/user.model';
import { ValidationException } from '../exceptions/validation.exception';
import { DuplicateResourceException } from '../exceptions/duplicate-resource.exception';
import { ResourceNotFoundException } from '../exceptions/resource-not-found.exception';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async createUser(data: {
    username: string;
    email: string;
    passwordHash: string;
    avatarUrl?: string | null;
    bio?: string | null;
  }): Promise<User> {
    const username = data.username?.trim();
    const email = data.email?.trim().toLowerCase();

    if (!username) {
      throw new ValidationException(
        'Username is required.',
        'USERNAME_REQUIRED',
      );
    }

    if (!email) {
      throw new ValidationException('Email is required.', 'EMAIL_REQUIRED');
    }

    if (!data.passwordHash) {
      throw new ValidationException(
        'Password hash is required.',
        'PASSWORD_HASH_REQUIRED',
      );
    }

    const existingUser = await this.userRepository.findOne({
      where: [{ username }, { email }],
    });

    if (existingUser) {
      throw new DuplicateResourceException(
        'User with the same username or email already exists.',
        'USER_DUPLICATE',
      );
    }

    const user = this.userRepository.create({
      username,
      email,
      passwordHash: data.passwordHash,
      avatarUrl: data.avatarUrl ?? null,
      bio: data.bio ?? null,
    });

    return this.userRepository.save(user);
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new ResourceNotFoundException(
        `User with id ${id} not found.`,
        'USER_NOT_FOUND',
      );
    }

    return user;
  }

  async findByEmail(email: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user) {
      throw new ResourceNotFoundException(
        `User with email ${email} not found.`,
        'USER_NOT_FOUND',
      );
    }

    return user;
  }

  async updateProfile(
    userId: string,
    data: {
      username?: string;
      bio?: string | null;
      avatarUrl?: string | null;
      favoriteCharacterIds?: number[] | null;
    },
  ): Promise<User> {
    const user = await this.findById(userId);

    if (data.username !== undefined) {
      const username = data.username.trim();
      if (!username) {
        throw new ValidationException(
          'Username cannot be empty.',
          'USERNAME_EMPTY',
        );
      }
      user.username = username;
    }

    if (data.bio !== undefined) {
      user.bio = data.bio ?? null;
    }

    if (data.avatarUrl !== undefined) {
      user.avatarUrl = data.avatarUrl ?? null;
    }

    if (data.favoriteCharacterIds !== undefined) {
      user.favoriteCharacterIds = data.favoriteCharacterIds ?? null;
    }

      return this.userRepository.save(user);
   }

   async getKinCount(characterId: number): Promise<number> {
      const users = await this.userRepository.find({
         where: { favoriteCharacterIds: Not(IsNull()) },
         select: { favoriteCharacterIds: true },
      });

      return users.filter((u) => {
         const ids = u.favoriteCharacterIds;
         return Array.isArray(ids) && ids.includes(characterId);
      }).length;
   }
}
