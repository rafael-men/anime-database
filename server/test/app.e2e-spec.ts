import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('App (e2e)', () => {
   let app: INestApplication;

   beforeEach(async () => {
      const moduleFixture: TestingModule = await Test.createTestingModule({
         imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication();
      await app.init();
   });

   afterEach(async () => {
      await app.close();
   });

   it('GET /auth/login should be reachable', () => {
      return request(app.getHttpServer())
         .post('/auth/login')
         .send({ email: 'nao-existe@test.com', password: '123456' })
         .expect(404);
   });
});
