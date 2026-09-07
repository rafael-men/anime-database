import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { User } from '../../domain/models/user.model';
import { UserService } from '../../use-cases/user/user.service';
import { AdminGuard } from '../auth/admin.guard';

@Controller('control')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly userService: UserService) {}

  @Get('users')
  async listAdultRequests(): Promise<User[]> {
    return this.userService.listAdultRequests();
  }

  @Post('users/:id/approve')
  @HttpCode(HttpStatus.OK)
  async approveAdultRequest(@Param('id') userId: string): Promise<User> {
    return this.userService.approveAdultRequest(userId);
  }

  @Post('users/:id/deny')
  @HttpCode(HttpStatus.OK)
  async denyAdultRequest(@Param('id') userId: string): Promise<User> {
    return this.userService.denyAdultRequest(userId);
  }
}