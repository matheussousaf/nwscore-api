import { Module } from '@nestjs/common';
import { AuthService } from './application/services/auth.service';
import { AuthController } from './presentation/controllers/auth.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserModule } from '@modules/user/user.module';
import { RedisModule } from '@shared/services/redis/redis.module';
import { JwtModule } from '@nestjs/jwt';
import { RedisSessionService } from './application/services/redis-session.service';
import { SESSION_SERVICE } from './application/interfaces/session.interface';

@Module({
  imports: [
    ConfigModule,
    UserModule,
    RedisModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'your-secret-key',
        signOptions: { expiresIn: '24h' },
      }),
      inject: [ConfigService],
    }),
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
