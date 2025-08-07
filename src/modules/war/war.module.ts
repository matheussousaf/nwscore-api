import { Module } from '@nestjs/common';
import { WarRepository } from './domain/repositories/war.repository';
import { WarController } from './presentation/controllers/war.controller';
import { WarService } from './application/services/war.service';
import { PrismaModule } from '@shared/services/prisma/prisma.module';
import { PlayerModule } from '@modules/player/player.module';
import { RedisBackgroundService } from '@shared/services/redis-background.service';

@Module({
  imports: [PrismaModule, PlayerModule],
  controllers: [WarController],
  providers: [WarRepository, WarService, RedisBackgroundService],
  exports: [WarRepository, WarService],
})
export class WarModule {}
