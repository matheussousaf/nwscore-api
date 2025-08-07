import { Module } from '@nestjs/common';
import { StatisticsController } from './presentation/controllers/statistics.controller';
import { StatisticsService } from './application/services/statistics.service';
import { LeaderboardService } from './application/services/leaderboard.service';
import { PlayerRepository } from '@modules/player/domain/repositories/player.repository';
import { WarRepository } from '@modules/war/domain/repositories/war.repository';
import { RedisModule } from '@shared/services/redis/redis.module';
import { PrismaModule } from '@shared/services/prisma/prisma.module';
import { InternalLoggerModule } from '@shared/services/logger/internal-logger.module';

@Module({
  imports: [RedisModule, PrismaModule, InternalLoggerModule],
  controllers: [StatisticsController],
  providers: [StatisticsService, LeaderboardService, PlayerRepository, WarRepository],
  exports: [StatisticsService, LeaderboardService],
})
export class StatisticsModule {}
