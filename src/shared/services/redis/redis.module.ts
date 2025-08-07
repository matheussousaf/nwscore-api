import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-store';
import { RedisService } from './redis.service';
import { InternalLoggerModule } from '../logger/internal-logger.module';

@Module({
  imports: [
    CacheModule.registerAsync({
      useFactory: async () => ({
        store: redisStore,
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        ttl: 60 * 60 * 24, // 24 hours
      }),
    }),
    InternalLoggerModule,
  ],
  providers: [RedisService],
  exports: [RedisService, CacheModule],
})
export class RedisModule {} 