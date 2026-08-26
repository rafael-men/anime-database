import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Group } from './group.model';
import { Review } from './review.model';
import { WatchlistItem } from './watchlist-item.model';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  username!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 255 })
  passwordHash!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  avatarUrl?: string | null;

  @Column({ type: 'text', nullable: true })
  bio?: string | null;

  @Column({ type: 'simple-json', nullable: true })
  favoriteCharacterIds?: number[] | null;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime', nullable: true })
  updatedAt?: Date | null;

  @OneToMany(() => Review, (review) => review.user)
  reviews!: Review[];

  @OneToMany(() => WatchlistItem, (item) => item.user)
  watchlistItems!: WatchlistItem[];

  @OneToMany(() => Group, (group) => group.owner)
  groups!: Group[];

  constructor(data: Partial<User> = {}) {
    Object.assign(this, data);
    this.username ??= '';
    this.email ??= '';
    this.passwordHash ??= '';
    this.createdAt ??= new Date();
  }

  getUsername(): string {
    return this.username;
  }

  setUsername(username: string): void {
    this.username = username;
  }

  getEmail(): string {
    return this.email;
  }

  setEmail(email: string): void {
    this.email = email;
  }

  getPasswordHash(): string {
    return this.passwordHash;
  }

  setPasswordHash(passwordHash: string): void {
    this.passwordHash = passwordHash;
  }

  getBio(): string | null | undefined {
    return this.bio;
  }

  setBio(bio?: string | null): void {
    this.bio = bio ?? null;
  }
}
