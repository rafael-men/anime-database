import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Group } from '../../domain/models/group.model';
import { GroupItem } from '../../domain/models/group-item.model';
import { ValidationException } from '../exceptions/validation.exception';
import { ResourceNotFoundException } from '../exceptions/resource-not-found.exception';

@Injectable()
export class GroupService {
  constructor(
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(GroupItem)
    private readonly groupItemRepository: Repository<GroupItem>,
  ) {}

  async createGroup(data: {
    ownerId: string;
    name: string;
    description?: string | null;
    coverImageUrl?: string | null;
    isPublic?: boolean;
  }): Promise<Group> {
    const name = data.name?.trim();
    if (!name) {
      throw new ValidationException(
        'Group name is required.',
        'GROUP_NAME_REQUIRED',
      );
    }

    if (!data.ownerId) {
      throw new ValidationException(
        'Owner id is required.',
        'OWNER_ID_REQUIRED',
      );
    }

    const group = this.groupRepository.create({
      ownerId: data.ownerId,
      name,
      description: data.description ?? null,
      coverImageUrl: data.coverImageUrl ?? null,
      isPublic: data.isPublic ?? true,
    });

    return this.groupRepository.save(group);
  }

  async findByOwner(ownerId: string): Promise<Group[]> {
    if (!ownerId) {
      throw new ValidationException(
        'Owner id is required.',
        'OWNER_ID_REQUIRED',
      );
    }

    return this.groupRepository.find({
      where: { ownerId },
      relations: { groupItems: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<Group> {
    const group = await this.groupRepository.findOne({
      where: { id },
      relations: { groupItems: true },
    });

    if (!group) {
      throw new ResourceNotFoundException(
        `Group with id ${id} not found.`,
        'GROUP_NOT_FOUND',
      );
    }

    return group;
  }

  async updateGroup(
    id: string,
    data: {
      name?: string;
      description?: string | null;
      coverImageUrl?: string | null;
      isPublic?: boolean;
    },
  ): Promise<Group> {
    const group = await this.findById(id);

    if (data.name !== undefined) {
      const name = data.name.trim();
      if (!name) {
        throw new ValidationException(
          'Group name cannot be empty.',
          'GROUP_NAME_EMPTY',
        );
      }
      group.name = name;
    }

    if (data.description !== undefined) {
      group.description = data.description ?? null;
    }

    if (data.coverImageUrl !== undefined) {
      group.coverImageUrl = data.coverImageUrl ?? null;
    }

    if (data.isPublic !== undefined) {
      group.isPublic = data.isPublic;
    }

    group.updatedAt = new Date();
    return this.groupRepository.save(group);
  }

  async deleteGroup(id: string): Promise<void> {
    const group = await this.findById(id);
    await this.groupRepository.remove(group);
  }

  async addItem(
    groupId: string,
    data: { externalAnimeId: string; order?: number; note?: string | null },
  ): Promise<GroupItem> {
    await this.findById(groupId);

    const externalAnimeId = data.externalAnimeId?.trim();
    if (!externalAnimeId) {
      throw new ValidationException(
        'Anime id is required.',
        'ANIME_ID_REQUIRED',
      );
    }

    const existing = await this.groupItemRepository.findOne({
      where: { groupId, externalAnimeId },
    });

    if (existing) {
      existing.order = data.order ?? existing.order ?? 0;
      existing.note = data.note ?? existing.note ?? null;
      return this.groupItemRepository.save(existing);
    }

    const item = this.groupItemRepository.create({
      groupId,
      externalAnimeId,
      order: data.order ?? 0,
      note: data.note ?? null,
    });

    return this.groupItemRepository.save(item);
  }

  async removeItem(groupId: string, animeId: string): Promise<void> {
    await this.findById(groupId);

    const item = await this.groupItemRepository.findOne({
      where: { groupId, externalAnimeId: animeId },
    });

    if (!item) {
      throw new ResourceNotFoundException(
        `Anime ${animeId} is not in the group.`,
        'ANIME_NOT_IN_GROUP',
      );
    }

    await this.groupItemRepository.remove(item);
  }
}
