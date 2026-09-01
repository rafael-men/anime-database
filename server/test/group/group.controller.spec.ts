import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { GroupController } from '../../src/application/controllers/group.controller';
import { GroupService } from '../../src/use-cases/group/group.service';
import { SessionAuthGuard } from '../../src/application/auth/session-auth.guard';

describe('GroupController', () => {
  let app: INestApplication;

  const groupServiceMock = {
    createGroup: jest.fn(),
    findByOwner: jest.fn(),
    findById: jest.fn(),
    updateGroup: jest.fn(),
    deleteGroup: jest.fn(),
    addItem: jest.fn(),
    removeItem: jest.fn(),
  };

  const mockGroup = {
    id: 'group-1',
    ownerId: 'user-1',
    name: 'Meu grupo',
    description: 'Grupo de testes',
    coverImageUrl: null,
    isPublic: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [GroupController],
      providers: [{ provide: GroupService, useValue: groupServiceMock }],
    })
      .overrideGuard(SessionAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });

  it('POST /groups should create a group', async () => {
    groupServiceMock.createGroup.mockResolvedValue(mockGroup);

    const response = await request(app.getHttpServer())
      .post('/groups')
      .send({
        ownerId: 'user-1',
        name: 'Meu grupo',
        description: 'Grupo de testes',
        isPublic: true,
      })
      .expect(201);

    expect(groupServiceMock.createGroup).toHaveBeenCalledWith({
      ownerId: 'user-1',
      name: 'Meu grupo',
      description: 'Grupo de testes',
      coverImageUrl: null,
      isPublic: true,
    });
    expect(response.body).toEqual(
      expect.objectContaining({
        id: 'group-1',
        name: 'Meu grupo',
        ownerId: 'user-1',
      }),
    );
  });

  it('POST /groups should reject when name is empty', async () => {
    await request(app.getHttpServer())
      .post('/groups')
      .send({ ownerId: 'user-1', name: '' })
      .expect(400);
  });

  it('POST /groups should reject when ownerId is missing', async () => {
    await request(app.getHttpServer())
      .post('/groups')
      .send({ name: 'Meu grupo' })
      .expect(400);
  });

  it('GET /groups/owner/:ownerId should return groups of the owner', async () => {
    groupServiceMock.findByOwner.mockResolvedValue([mockGroup]);

    const response = await request(app.getHttpServer())
      .get('/groups/owner/user-1')
      .expect(200);

    expect(groupServiceMock.findByOwner).toHaveBeenCalledWith('user-1');
    expect(response.body).toHaveLength(1);
    expect(response.body[0].name).toBe('Meu grupo');
  });

  it('GET /groups/:id should return a group', async () => {
    groupServiceMock.findById.mockResolvedValue({
      ...mockGroup,
      groupItems: [
        { groupId: 'group-1', externalAnimeId: '1', order: 0, note: null },
      ],
    });

    const response = await request(app.getHttpServer())
      .get('/groups/group-1')
      .expect(200);

    expect(groupServiceMock.findById).toHaveBeenCalledWith('group-1');
    expect(response.body.groupItems).toHaveLength(1);
    expect(response.body.groupItems[0].externalAnimeId).toBe('1');
  });

  it('PATCH /groups/:id should update the group', async () => {
    groupServiceMock.updateGroup.mockResolvedValue({
      ...mockGroup,
      name: 'Grupo atualizado',
      isPublic: false,
    });

    const response = await request(app.getHttpServer())
      .patch('/groups/group-1')
      .send({ name: 'Grupo atualizado', isPublic: false })
      .expect(200);

    expect(groupServiceMock.updateGroup).toHaveBeenCalledWith('group-1', {
      name: 'Grupo atualizado',
      description: undefined,
      coverImageUrl: undefined,
      isPublic: false,
    });
    expect(response.body.name).toBe('Grupo atualizado');
    expect(response.body.isPublic).toBe(false);
  });

  it('DELETE /groups/:id should delete the group', async () => {
    groupServiceMock.deleteGroup.mockResolvedValue(undefined);

    await request(app.getHttpServer())
      .delete('/groups/group-1')
      .expect(204);

    expect(groupServiceMock.deleteGroup).toHaveBeenCalledWith('group-1');
  });

  it('POST /groups/:id/items should add an anime to the group', async () => {
    groupServiceMock.addItem.mockResolvedValue({
      groupId: 'group-1',
      externalAnimeId: '123',
      order: 0,
      note: null,
    });

    const response = await request(app.getHttpServer())
      .post('/groups/group-1/items')
      .send({ externalAnimeId: '123' })
      .expect(201);

    expect(groupServiceMock.addItem).toHaveBeenCalledWith('group-1', {
      externalAnimeId: '123',
      order: undefined,
      note: undefined,
    });
    expect(response.body).toEqual(
      expect.objectContaining({ groupId: 'group-1', externalAnimeId: '123' }),
    );
  });

  it('POST /groups/:id/items should reject when externalAnimeId is missing', async () => {
    await request(app.getHttpServer())
      .post('/groups/group-1/items')
      .send({})
      .expect(400);
  });

  it('DELETE /groups/:id/items/:animeId should remove an anime from the group', async () => {
    groupServiceMock.removeItem.mockResolvedValue(undefined);

    await request(app.getHttpServer())
      .delete('/groups/group-1/items/123')
      .expect(204);

    expect(groupServiceMock.removeItem).toHaveBeenCalledWith('group-1', '123');
  });
});
