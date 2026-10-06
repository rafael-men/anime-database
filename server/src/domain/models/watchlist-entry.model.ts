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
import { WatchlistStatus } from '../enums/WatchlistStatus';

export { WatchlistStatus };

@Entity({ name: 'watchlist_entries' })
@Index(['userId', 'externalAnimeId'], { unique: true })
@Index(['userId', 'addedAt'])
export class WatchlistEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
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

  @Column({ type: 'datetime', nullable: true })
  watchedAt?: Date | null;

  @CreateDateColumn({ type: 'datetime' })
  addedAt!: Date;

  @UpdateDateColumn({ type: 'datetime', nullable: true })
  updatedAt?: Date | null;
}