import { Module } from '@nestjs/common';
import { StatisticsController } from './presentation/controllers/statistics.controller';
import { StatisticsService } from './application/services/statistics.service';
import { PlayerRepository } from '@modules/player/domain/repositories/player.repository';
import { WarRepository } from '@modules/war/domain/repositories/war.repository';
import { RedisModule } from '@shared/services/redis.module';
import { PrismaModule } from '@shared/services/prisma/prisma.module';

@Module({
  imports: [RedisModule, PrismaModule],
  controllers: [StatisticsController],
  providers: [StatisticsService, PlayerRepository, WarRepository],
  exports: [StatisticsService],
})
export class StatisticsModule {}
