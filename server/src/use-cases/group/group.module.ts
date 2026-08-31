import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Group } from '../../domain/models/group.model';
import { GroupItem } from '../../domain/models/group-item.model';
import { GroupService } from './group.service';

@Module({
  imports: [TypeOrmModule.forFeature([Group, GroupItem])],
  providers: [GroupService],
  exports: [GroupService],
})
export class GroupModule {}
