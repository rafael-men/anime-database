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
} from '@nestjs/common';
import { Group } from '../../domain/models/group.model';
import { GroupItem } from '../../domain/models/group-item.model';
import {
  AddGroupItemDto,
  CreateGroupDto,
  UpdateGroupDto,
} from './dto/group.dto';

@Controller('groups')
export class GroupController {
  constructor() {}

  @Post()
  async createGroup(@Body() body: CreateGroupDto): Promise<Group> {
    const group = new Group({
      ownerId: body.ownerId,
      name: body.name,
      description: body.description ?? null,
      coverImageUrl: body.coverImageUrl ?? null,
      isPublic: body.isPublic ?? true,
    });

    return group;
  }

  @Get(':id')
  async findGroupById(@Param('id') id: string): Promise<Group> {
    const group = new Group({
      id,
      ownerId: '00000000-0000-0000-0000-000000000000',
      name: 'Sample group',
    });

    return group;
  }

  @Patch(':id')
  async updateGroup(
    @Param('id') id: string,
    @Body() body: UpdateGroupDto,
  ): Promise<Group> {
    const group = new Group({
      id,
      ownerId: '00000000-0000-0000-0000-000000000000',
      name: body.name ?? 'Sample group',
      description: body.description ?? null,
      coverImageUrl: body.coverImageUrl ?? null,
      isPublic: body.isPublic ?? true,
    });

    return group;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteGroup(@Param('id') id: string): Promise<void> {
    return;
  }

  @Post(':id/items')
  async addItem(
    @Param('id') groupId: string,
    @Body() body: AddGroupItemDto,
  ): Promise<GroupItem> {
    const item = new GroupItem({
      groupId,
      externalAnimeId: body.externalAnimeId,
      order: body.order ?? 0,
      note: body.note ?? null,
    });

    return item;
  }

  @Delete(':id/items/:animeId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeItem(
    @Param('id') groupId: string,
    @Param('animeId') animeId: string,
  ): Promise<void> {
    return;
  }
}
