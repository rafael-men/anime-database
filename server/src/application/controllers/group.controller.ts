import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Group } from '../../domain/models/group.model';
import { GroupItem } from '../../domain/models/group-item.model';
import { GroupService } from '../../use-cases/group/group.service';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import {
  AddGroupItemDto,
  CreateGroupDto,
  UpdateGroupDto,
} from './dto/group.dto';

@Controller('groups')
@UseGuards(SessionAuthGuard)
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  @Post()
  async createGroup(@Body() body: CreateGroupDto): Promise<Group> {
    return this.groupService.createGroup({
      ownerId: body.ownerId,
      name: body.name,
      description: body.description ?? null,
      coverImageUrl: body.coverImageUrl ?? null,
      isPublic: body.isPublic ?? true,
    });
  }

  @Get('owner/:ownerId')
  async findByOwner(@Param('ownerId') ownerId: string): Promise<Group[]> {
    return this.groupService.findByOwner(ownerId);
  }

  @Get(':id')
  async findGroupById(@Param('id') id: string): Promise<Group> {
    return this.groupService.findById(id);
  }

  @Patch(':id')
  async updateGroup(
    @Param('id') id: string,
    @Body() body: UpdateGroupDto,
  ): Promise<Group> {
    return this.groupService.updateGroup(id, {
      name: body.name,
      description: body.description,
      coverImageUrl: body.coverImageUrl,
      isPublic: body.isPublic,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteGroup(@Param('id') id: string): Promise<void> {
    await this.groupService.deleteGroup(id);
  }

  @Post(':id/items')
  async addItem(
    @Param('id') groupId: string,
    @Body() body: AddGroupItemDto,
  ): Promise<GroupItem> {
    return this.groupService.addItem(groupId, {
      externalAnimeId: body.externalAnimeId,
      order: body.order,
      note: body.note,
    });
  }

  @Delete(':id/items/:animeId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeItem(
    @Param('id') groupId: string,
    @Param('animeId') animeId: string,
  ): Promise<void> {
    await this.groupService.removeItem(groupId, animeId);
  }
}
