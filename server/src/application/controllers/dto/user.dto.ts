export class CreateUserDto {
  username!: string;
  email!: string;
  passwordHash!: string;
  avatarUrl?: string | null;
  bio?: string | null;
}

export class AddFavoriteDto {
  externalAnimeId!: string;
  status?: string;
}

export class CreateReviewDto {
  externalAnimeId!: string;
  rating!: number;
  comment?: string | null;
  watchedAt?: Date;
  isRewatch?: boolean;
  hasSpoilers?: boolean;
}

