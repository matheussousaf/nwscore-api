import { Module } from '@nestjs/common';
import { AuthService } from './application/services/auth.service';
import { AuthController } from './presentation/controllers/auth.controller';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from '@modules/user/user.module';
import { RedisModule } from '@shared/services/redis/redis.module';
import { RedisSessionService } from './application/services/redis-session.service';
import { SESSION_SERVICE } from './application/interfaces/session.interface';

@Module({
  imports: [
    ConfigModule,
    UserModule,
    RedisModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    RedisSessionService,
    {
      provide: SESSION_SERVICE,
      useClass: RedisSessionService,
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
