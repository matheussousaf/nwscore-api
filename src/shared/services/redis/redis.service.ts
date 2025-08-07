import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import { InternalLoggerService } from '../logger/internal-logger.service';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private redisClient: RedisClientType;

  constructor(private readonly logger: InternalLoggerService) {
    this.redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });
  }

  async onModuleInit() {
    await this.redisClient.connect();
    this.logger.log('Connected to Redis');
  }

  async onModuleDestroy() {
    await this.redisClient.disconnect();
    this.logger.log('Disconnected from Redis');
  }

  // Generic Redis operations
  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.redisClient.setEx(key, ttl, value);
    } else {
      await this.redisClient.set(key, value);
    }
  }

  async get(key: string): Promise<string | object> {
    return await this.redisClient.get(key);
  }

  async del(key: string): Promise<number> {
    return await this.redisClient.del(key);
  }

  async exists(key: string): Promise<number> {
    return await this.redisClient.exists(key);
  }

  async keys(pattern: string): Promise<string[]> {
    return await this.redisClient.keys(pattern);
  }

  // Hash operations
  async hSet(key: string, field: string, value: string): Promise<number> {
    return await this.redisClient.hSet(key, field, value);
  }

  async hSetMultiple(
    key: string,
    fields: Record<string, string>,
  ): Promise<number> {
    return await this.redisClient.hSet(key, fields);
  }

  async hGet(key: string, field: string): Promise<string | object> {
    return await this.redisClient.hGet(key, field);
  }

  async hGetAll(key: string): Promise<Record<string, string>> {
    return await this.redisClient.hGetAll(key);
  }

  async hIncrBy(
    key: string,
    field: string,
    increment: number,
  ): Promise<number> {
    return await this.redisClient.hIncrBy(key, field, increment);
  }

  async hIncrByFloat(
    key: string,
    field: string,
    increment: number,
  ): Promise<string> {
    return await this.redisClient.hIncrByFloat(key, field, increment);
  }

  // Sorted Set operations
  async zAdd(key: string, score: number, value: string): Promise<number> {
    return await this.redisClient.zAdd(key, { score, value });
  }

  async zAddMultiple(
    key: string,
    members: Array<{ score: number; value: string }>,
  ): Promise<number> {
    return await this.redisClient.zAdd(key, members);
  }

  async zRange(
    key: string,
    start: number,
    stop: number,
    options?: { REV?: boolean },
  ): Promise<string[]> {
    return await this.redisClient.zRange(key, start, stop, options);
  }

  async zRangeWithScores(
    key: string,
    start: number,
    stop: number,
    options?: { REV?: boolean },
  ): Promise<Array<{ value: string; score: number }>> {
    return await this.redisClient.zRangeWithScores(key, start, stop, options);
  }

  async zCard(key: string): Promise<number> {
    return await this.redisClient.zCard(key);
  }

  async zScore(key: string, value: string): Promise<number | null> {
    return await this.redisClient.zScore(key, value);
  }

  // Pipeline operations
  createPipeline(): ReturnType<typeof this.redisClient.multi> {
    return this.redisClient.multi();
  }

  // Get the raw Redis client for advanced operations
  getClient(): RedisClientType {
    return this.redisClient;
  }
}
