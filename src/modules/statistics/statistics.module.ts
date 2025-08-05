import { Module } from '@nestjs/common';
import { StatisticsController } from './presentation/controllers/statistics.controller';
import { StatisticsService } from './application/services/statistics.service';
import { PlayerModule } from '@modules/player/player.module';
import { WarModule } from '@modules/war/war.module';

@Module({
  imports: [PlayerModule, WarModule],
  controllers: [StatisticsController],
  providers: [StatisticsService],
})
export class StatisticsModule {}
