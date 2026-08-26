import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Group } from './group.model';

@Entity({ name: 'group_items' })
@Index(['groupId', 'externalAnimeId'], { unique: true })
export class GroupItem {
  @PrimaryColumn({ type: 'uuid' })
  groupId!: string;

  @ManyToOne(() => Group, (group) => group.groupItems, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupId' })
  group!: Group;

  @PrimaryColumn({ type: 'varchar', length: 255 })
  externalAnimeId!: string;

  @Column({ type: 'int', default: 0 })
  order!: number;

  @Column({ type: 'text', nullable: true })
  note?: string | null;

  constructor(data: Partial<GroupItem> = {}) {
    Object.assign(this, data);
    this.externalAnimeId ??= '';
    this.order ??= 0;
  }

  getExternalAnimeId(): string {
    return this.externalAnimeId;
  }

  setExternalAnimeId(externalAnimeId: string): void {
    this.externalAnimeId = externalAnimeId;
  }

  getOrder(): number {
    return this.order;
  }

  setOrder(order: number): void {
    this.order = order;
  }
}
