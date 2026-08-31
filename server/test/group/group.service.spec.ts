import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GroupService } from '../../src/use-cases/group/group.service';
import { Group } from '../../src/domain/models/group.model';
import { GroupItem } from '../../src/domain/models/group-item.model';
import { ValidationException } from '../../src/use-cases/exceptions/validation.exception';
import { ResourceNotFoundException } from '../../src/use-cases/exceptions/resource-not-found.exception';

describe('GroupService', () => {
  let service: GroupService;

  const groupRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const groupItemRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const groupFixture = {
    id: 'group-1',
    ownerId: 'user-1',
    name: 'Meu grupo',
    description: 'desc',
    coverImageUrl: null,
    isPublic: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    groupItems: [],
  }; 

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        GroupService,
        { provide: getRepositoryToken(Group), useValue: groupRepository },
        { provide: getRepositoryToken(GroupItem), useValue: groupItemRepository },
      ],
    }).compile();

    service = moduleRef.get<GroupService>(GroupService);
  });

  it('should create a group and persist it', async () => {
    groupRepository.create.mockReturnValue(groupFixture);
    groupRepository.save.mockResolvedValue(groupFixture);

    const result = await service.createGroup({
      ownerId: 'user-1',
      name: 'Meu grupo',
      description: 'desc',
      isPublic: true,
    });

    expect(groupRepository.create).toHaveBeenCalledWith({
      ownerId: 'user-1',
      name: 'Meu grupo',
      description: 'desc',
      coverImageUrl: null,
      isPublic: true,
    });
    expect(groupRepository.save).toHaveBeenCalledWith(groupFixture);
    expect(result.name).toBe('Meu grupo');
  });

  it('should throw when creating a group with empty name', async () => {
    await expect(
      service.createGroup({ ownerId: 'user-1', name: '   ' }),
    ).rejects.toBeInstanceOf(ValidationException);
    expect(groupRepository.save).not.toHaveBeenCalled();
  });

  it('should throw when creating a group without ownerId', async () => {
    await expect(
      service.createGroup({ ownerId: '', name: 'Meu grupo' }),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('should find all groups by owner ordered by creation', async () => {
    groupRepository.find.mockResolvedValue([groupFixture]);

    const result = await service.findByOwner('user-1');

    expect(groupRepository.find).toHaveBeenCalledWith({
      where: { ownerId: 'user-1' },
      relations: { groupItems: true },
      order: { createdAt: 'DESC' },
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('group-1');
  });

  it('should find a group by id with its items', async () => {
    groupRepository.findOne.mockResolvedValue({
      ...groupFixture,
      groupItems: [
        { groupId: 'group-1', externalAnimeId: '123', order: 0, note: null },
      ],
    });

    const result = await service.findById('group-1');

    expect(groupRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'group-1' },
      relations: { groupItems: true },
    });
    expect(result.groupItems).toHaveLength(1);
    expect(result.groupItems[0].externalAnimeId).toBe('123');
  });

  it('should throw when group is not found', async () => {
    groupRepository.findOne.mockResolvedValue(null);

    await expect(service.findById('missing')).rejects.toBeInstanceOf(
      ResourceNotFoundException,
    );
  });

  it('should update the group name and privacy', async () => {
    groupRepository.findOne.mockResolvedValue({ ...groupFixture });
    groupRepository.save.mockResolvedValue({
      ...groupFixture,
      name: 'Novo nome',
      isPublic: false,
    });

    const result = await service.updateGroup('group-1', {
      name: 'Novo nome',
      isPublic: false,
    });

    expect(groupRepository.save).toHaveBeenCalled();
    expect(result.name).toBe('Novo nome');
    expect(result.isPublic).toBe(false);
  });

  it('should throw when updating to an empty name', async () => {
    groupRepository.findOne.mockResolvedValue({ ...groupFixture });

    await expect(
      service.updateGroup('group-1', { name: '  ' }),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('should delete a group', async () => {
    groupRepository.findOne.mockResolvedValue({ ...groupFixture });
    groupRepository.remove.mockResolvedValue(undefined);

    await service.deleteGroup('group-1');

    expect(groupRepository.remove).toHaveBeenCalled();
  });

  it('should add an item to a group', async () => {
    groupRepository.findOne.mockResolvedValue({ ...groupFixture });
    groupItemRepository.findOne.mockResolvedValue(null);
    groupItemRepository.create.mockReturnValue({
      groupId: 'group-1',
      externalAnimeId: '123',
      order: 0,
      note: null,
    });
    groupItemRepository.save.mockImplementation(async (item) => item);

    const result = await service.addItem('group-1', {
      externalAnimeId: '123',
    });

    expect(groupItemRepository.create).toHaveBeenCalledWith({
      groupId: 'group-1',
      externalAnimeId: '123',
      order: 0,
      note: null,
    });
    expect(result.externalAnimeId).toBe('123');
  });

  it('should not duplicate an item already in the group', async () => {
    groupRepository.findOne.mockResolvedValue({ ...groupFixture });
    const existing = {
      groupId: 'group-1',
      externalAnimeId: '123',
      order: 2,
      note: 'nota',
    };
    groupItemRepository.findOne.mockResolvedValue(existing);
    groupItemRepository.save.mockImplementation(async (item) => item);

    const result = await service.addItem('group-1', {
      externalAnimeId: '123',
    });

    expect(groupItemRepository.create).not.toHaveBeenCalled();
    expect(result.externalAnimeId).toBe('123');
    expect(result.order).toBe(2);
  });

  it('should remove an item from a group', async () => {
    groupRepository.findOne.mockResolvedValue({ ...groupFixture });
    groupItemRepository.findOne.mockResolvedValue({
      groupId: 'group-1',
      externalAnimeId: '123',
      order: 0,
    });
    groupItemRepository.remove.mockResolvedValue(undefined);

    await service.removeItem('group-1', '123');

    expect(groupItemRepository.findOne).toHaveBeenCalledWith({
      where: { groupId: 'group-1', externalAnimeId: '123' },
    });
    expect(groupItemRepository.remove).toHaveBeenCalled();
  });

  it('should throw when removing an item that is not in the group', async () => {
    groupRepository.findOne.mockResolvedValue({ ...groupFixture });
    groupItemRepository.findOne.mockResolvedValue(null);

    await expect(service.removeItem('group-1', '999')).rejects.toBeInstanceOf(
      ResourceNotFoundException,
    );
  });
});
