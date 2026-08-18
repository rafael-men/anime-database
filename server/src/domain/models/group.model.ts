import {
   Column,
   CreateDateColumn,
   Entity,
   JoinColumn,
   ManyToOne,
   OneToMany,
   PrimaryGeneratedColumn,
   UpdateDateColumn,
} from 'typeorm';
import { GroupItem } from './group-item.model';
import { User } from './user.model';

@Entity({ name: 'groups' })
export class Group {
   @PrimaryGeneratedColumn('uuid')
   id!: string;

   @Column({ type: 'uuid' })
   ownerId!: string;

   @ManyToOne(() => User, (user) => user.groups, { onDelete: 'CASCADE' })
   @JoinColumn({ name: 'ownerId' })
   owner!: User;

   @Column({ type: 'varchar', length: 120 })
   name!: string;

   @Column({ type: 'text', nullable: true })
   description?: string | null;

   @Column({ type: 'varchar', length: 255, nullable: true })
   coverImageUrl?: string | null;

   @Column({ type: 'boolean', default: true })
   isPublic!: boolean;

   @CreateDateColumn({ type: 'datetime' })
   createdAt!: Date;

   @UpdateDateColumn({ type: 'datetime', nullable: true })
   updatedAt?: Date | null;

   @OneToMany(() => GroupItem, (item) => item.group)
   groupItems!: GroupItem[];

   constructor(data: Partial<Group> = {}) {
      Object.assign(this, data);
      this.name ??= '';
      this.isPublic ??= true;
      this.createdAt ??= new Date();
   }

   getName(): string {
      return this.name;
   }

   setName(name: string): void {
      this.name = name;
   }

   getDescription(): string | null | undefined {
      return this.description;
   }

   setDescription(description?: string | null): void {
      this.description = description ?? null;
   }

   isPublicGroup(): boolean {
      return this.isPublic;
   }

   setPublic(isPublic: boolean): void {
      this.isPublic = isPublic;
   }
}
