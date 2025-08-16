import { Module } from '@nestjs/common';
import { CompanyController } from './presentation/company.controller';
import { PrismaModule } from '@shared/services/prisma/prisma.module';
import { CompanyRepository } from './domain/repositories/company.repository';
import { CompanyService } from './application/services/company.service';
import { UserModule } from '@modules/user/user.module';
import { CompanyLeaderGuard } from './presentation/guards/company-leader.guard';
import { SessionAuthGuard } from '@modules/auth/presentation/guards/session-auth.guard';
import { SESSION_SERVICE } from '@modules/auth/application/interfaces/session.interface';
import { RedisSessionService } from '@modules/auth/application/services/redis-session.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisModule } from '@shared/services/redis/redis.module';

@Module({
  imports: [
    PrismaModule, 
    UserModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'your-secret-key',
        signOptions: { expiresIn: '24h' },
      }),
      inject: [ConfigService],
    }),
    RedisModule,
  ],
  providers: [
    CompanyService, 
    CompanyRepository,
    SessionAuthGuard,
    CompanyLeaderGuard,
    {
      provide: SESSION_SERVICE,
      useClass: RedisSessionService,
    },
  ],
  controllers: [CompanyController],
  exports: [],
})
export class CompanyModule {}
