import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-store';
import { RedisLeaderboardService } from './redis-leaderboard.service';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    CacheModule.registerAsync({
      useFactory: async () => ({
        store: redisStore,
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        ttl: 60 * 60 * 24, // 24 hours
      }),
    }),
    PrismaModule,
  ],
  providers: [RedisLeaderboardService],
  exports: [RedisLeaderboardService, CacheModule],
})
export class RedisModule {} 