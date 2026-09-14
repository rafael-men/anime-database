import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { FollowService } from '../../use-cases/follow/follow.service';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { User } from '../../domain/models/user.model';

interface AuthRequest {
  user: { sub: string; email: string; username: string };
}

@Controller('follows')
@UseGuards(SessionAuthGuard)
export class FollowController {
  constructor(private readonly followService: FollowService) {}

  @Post(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async follow(
    @Req() req: AuthRequest,
    @Param('id') targetUserId: string,
  ): Promise<void> {
    await this.followService.follow(req.user.sub, targetUserId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unfollow(
    @Req() req: AuthRequest,
    @Param('id') targetUserId: string,
  ): Promise<void> {
    await this.followService.unfollow(req.user.sub, targetUserId);
  }

  @Get(':id/check')
  async checkFollowing(
    @Req() req: AuthRequest,
    @Param('id') targetUserId: string,
  ): Promise<{ isFollowing: boolean }> {
    const isFollowing = await this.followService.isFollowing(
      req.user.sub,
      targetUserId,
    );
    return { isFollowing };
  }

  @Get(':id/counts')
  async getCounts(@Param('id') userId: string) {
    return this.followService.getFollowCounts(userId);
  }

  @Get(':id/followers')
  async getFollowers(@Param('id') userId: string): Promise<User[]> {
    return this.followService.getFollowers(userId);
  }

  @Get(':id/following')
  async getFollowing(@Param('id') userId: string): Promise<User[]> {
    return this.followService.getFollowing(userId);
  }
}
