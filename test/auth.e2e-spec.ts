import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AuthController (e2e)', () => {
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

  describe('/auth/protected (GET)', () => {
    it('should return 401 when no session token is provided', () => {
      return request(app.getHttpServer())
        .get('/auth/protected')
        .expect(401);
    });

    it('should return 401 when invalid session token is provided', () => {
      return request(app.getHttpServer())
        .get('/auth/protected')
        .set('Authorization', 'Session invalid-token')
        .expect(401);
    });
  });

  describe('/auth/login (POST)', () => {
    it('should return 400 when invalid login data is provided', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({})
        .expect(400);
    });
  });

  describe('/auth/signup (POST)', () => {
    it('should return 400 when invalid signup data is provided', () => {
      return request(app.getHttpServer())
        .post('/auth/signup')
        .send({})
        .expect(400);
    });
  });
});
