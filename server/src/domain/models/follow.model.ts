import {
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from './user.model';

@Entity({ name: 'follows' })
@Unique(['follower', 'following'])
export class Follow {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  follower!: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  following!: User;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;
}
