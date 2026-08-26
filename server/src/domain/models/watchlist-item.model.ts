import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.model';

export enum WatchlistStatus {
  PLANNED = 'PLANNED',
  WATCHING = 'WATCHING',
  DROPPED = 'DROPPED',
}

@Entity({ name: 'watchlist_items' })
@Index(['userId', 'externalAnimeId'], { unique: true })
export class WatchlistItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, (user) => user.watchlistItems, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'varchar', length: 255 })
  externalAnimeId!: string;

  @Column({
    type: 'enum',
    enum: WatchlistStatus,
    default: WatchlistStatus.PLANNED,
  })
  status!: WatchlistStatus;

  @CreateDateColumn({ type: 'datetime' })
  addedAt!: Date;

  @UpdateDateColumn({ type: 'datetime', nullable: true })
  updatedAt?: Date | null;

  constructor(data: Partial<WatchlistItem> = {}) {
    Object.assign(this, data);
    this.externalAnimeId ??= '';
    this.status ??= WatchlistStatus.PLANNED;
    this.addedAt ??= new Date();
  }

  getStatus(): WatchlistStatus {
    return this.status;
  }

  setStatus(status: WatchlistStatus): void {
    this.status = status;
  }

  getExternalAnimeId(): string {
    return this.externalAnimeId;
  }

  setExternalAnimeId(externalAnimeId: string): void {
    this.externalAnimeId = externalAnimeId;
  }
}
