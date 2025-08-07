import { Module } from '@nestjs/common';
import { WarRepository } from './domain/repositories/war.repository';
import { WarController } from './presentation/controllers/war.controller';
import { WarService } from './application/services/war.service';
import { PrismaModule } from '@shared/services/prisma/prisma.module';
import { PlayerModule } from '@modules/player/player.module';
import { StatisticsModule } from '@modules/statistics/statistics.module';
import { BackgroundModule } from '@shared/services/background/background.module';

@Module({
  imports: [PrismaModule, PlayerModule, StatisticsModule, BackgroundModule],
  controllers: [WarController],
  providers: [WarRepository, WarService],
  exports: [WarRepository, WarService],
})
export class WarModule {}
