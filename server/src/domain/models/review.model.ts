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

@Entity({ name: 'reviews' })
@Index(['userId', 'externalAnimeId'], { unique: true })
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, (user) => user.reviews, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'varchar', length: 255 })
  externalAnimeId!: string;

  @Column({ type: 'decimal', precision: 3, scale: 1, default: 0 })
  rating!: number;

  @Column({ type: 'text', nullable: true })
  comment?: string | null;

  @Column({ type: 'datetime' })
  watchedAt!: Date;

  @Column({ type: 'boolean', default: false })
  isRewatch!: boolean;

  @Column({ type: 'boolean', default: false })
  hasSpoilers!: boolean;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date;

  constructor(data: Partial<Review> = {}) {
    Object.assign(this, data);
    this.externalAnimeId ??= '';
    this.rating ??= 0;
    this.watchedAt ??= new Date();
    this.isRewatch ??= false;
    this.hasSpoilers ??= false;
    this.createdAt ??= new Date();
    this.updatedAt ??= new Date();
  }

  getRatingValue(): number {
    return this.rating;
  }

  setRatingValue(rating: number): void {
    this.rating = rating;
  }

  getComment(): string | null | undefined {
    return this.comment;
  }

  setComment(comment?: string | null): void {
    this.comment = comment ?? null;
  }

  getExternalAnimeId(): string {
    return this.externalAnimeId;
  }

  setExternalAnimeId(externalAnimeId: string): void {
    this.externalAnimeId = externalAnimeId;
  }
}
