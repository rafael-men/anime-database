import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Follow } from '../../domain/models/follow.model';
import { User } from '../../domain/models/user.model';
import { FollowService } from './follow.service';

@Module({
  imports: [TypeOrmModule.forFeature([Follow, User])],
  providers: [FollowService],
  exports: [FollowService],
})
export class FollowModule {}
