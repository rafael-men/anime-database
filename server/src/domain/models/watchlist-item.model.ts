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


@Entity({ name: 'watchlist_items' })
@Index(['userId', 'addedAt'])
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

  @Column({ type: 'varchar', length: 32, default: 'PLANNED' })
  status!: string;

  @CreateDateColumn({ type: 'datetime' })
  addedAt!: Date;

  @UpdateDateColumn({ type: 'datetime', nullable: true })
  updatedAt?: Date | null;

  constructor(data: Partial<WatchlistItem> = {}) {
    Object.assign(this, data);
    this.externalAnimeId ??= '';
    this.status ??= 'PLANNED';
    this.addedAt ??= new Date();
  }

  getStatus(): string {
    return this.status;
  }

  setStatus(status: string): void {
    this.status = status;
  }

  getExternalAnimeId(): string {
    return this.externalAnimeId;
  }

  setExternalAnimeId(externalAnimeId: string): void {
    this.externalAnimeId = externalAnimeId;
  }
}
