import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import {
  HealthIndicatorResult,
} from '@nestjs/terminus';

@Injectable()
export class PrismaHealthIndicator {
  constructor(private readonly prisma: PrismaClient) {}

  async checkDatabase(): Promise<HealthIndicatorResult> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        database: {
          status: 'up',
        },
      };
    } catch (error) {
      return {
        database: {
          status: 'down',
          error: error.message,
        },
      };
    }
  }
}
