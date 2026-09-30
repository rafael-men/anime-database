import {
  BadRequestException,
  Controller,
  DefaultValuePipe,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UserService } from '../../use-cases/user/user.service';
import { AdminGuard } from '../auth/admin.guard';
import {
  ADMIN_REQUESTS_DEFAULT_LIMIT,
  ADMIN_REQUESTS_MAX_LIMIT,
  AdultRequestDto,
  toAdultRequestDto,
  toAdultRequestDtos,
} from './dto/admin.dto';

const ADMIN_THROTTLE_LIMIT = 20;
const ADMIN_THROTTLE_TTL_MS = 60_000;

@Controller('control')
@UseGuards(AdminGuard)
@Throttle({
  default: { limit: ADMIN_THROTTLE_LIMIT, ttl: ADMIN_THROTTLE_TTL_MS },
})
export class AdminController {
  constructor(private readonly userService: UserService) {}

  @Get('users')
  async listAdultRequests(
    @Query(
      'limit',
      new DefaultValuePipe(ADMIN_REQUESTS_DEFAULT_LIMIT),
      ParseIntPipe,
    )
    limit: number,
  ): Promise<AdultRequestDto[]> {
    // Bounds are enforced here rather than in the service so that a negative
    // or oversized value can never reach TypeORM: a negative `take` flips its
    // semantics (reads from the end of the result set) and an unbounded one
    // turns the endpoint into a bulk PII dump.
    if (
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > ADMIN_REQUESTS_MAX_LIMIT
    ) {
      throw new BadRequestException(
        `limit must be an integer between 1 and ${ADMIN_REQUESTS_MAX_LIMIT}.`,
      );
    }

    const requests = await this.userService.listAdultRequests(limit);
    return toAdultRequestDtos(requests);
  }

  @Post('users/:id/approve')
  @HttpCode(HttpStatus.OK)
  async approveAdultRequest(
    @Param('id') userId: string,
  ): Promise<AdultRequestDto> {
    const user = await this.userService.approveAdultRequest(userId);
    return toAdultRequestDto(user);
  }

  @Post('users/:id/deny')
  @HttpCode(HttpStatus.OK)
  async denyAdultRequest(
    @Param('id') userId: string,
  ): Promise<AdultRequestDto> {
    const user = await this.userService.denyAdultRequest(userId);
    return toAdultRequestDto(user);
  }
}
