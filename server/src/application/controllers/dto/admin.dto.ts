import { Expose, plainToInstance } from 'class-transformer';
import type { AdultRequestStatus } from '../../../utils/constants';
import { User } from '../../../domain/models/user.model';

export const ADMIN_REQUESTS_DEFAULT_LIMIT = 50;
export const ADMIN_REQUESTS_MAX_LIMIT = 100;

export class AdultRequestDto {
  @Expose()
  id!: string;

  @Expose()
  username!: string;

  @Expose()
  email!: string;

  @Expose()
  birthDate?: string | null;

  @Expose()
  adultRequestStatus!: AdultRequestStatus;

  @Expose()
  adultContentEnabled!: boolean;

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt?: Date | null;
}

export function toAdultRequestDto(user: User): AdultRequestDto {
  return plainToInstance(AdultRequestDto, user, {
    excludeExtraneousValues: true,
  });
}

export function toAdultRequestDtos(users: User[]): AdultRequestDto[] {
  return users.map(toAdultRequestDto);
}
