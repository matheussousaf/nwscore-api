import { Module } from '@nestjs/common';
import { PrismaHealthIndicator, TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { PrismaClient } from '@prisma/client';
import { HttpModule } from '@nestjs/axios';
import { withAccelerate } from '@prisma/extension-accelerate';

@Module({
  imports: [TerminusModule, HttpModule],
  controllers: [HealthController],
  providers: [
    PrismaHealthIndicator,
    {
      provide: PrismaClient,
      useValue: new PrismaClient().$extends(withAccelerate()),
    },
  ],
})
export class HealthModule {}
