import { Module } from '@nestjs/common';
import { PlayerRepository } from './domain/repositories/player.repository';
import { PrismaModule } from '@shared/services/prisma/prisma.module';
import { PlayerController } from './presentation/controllers/player.controller';
import { PlayerService } from './application/services/player.service';

@Module({
  imports: [PrismaModule],
  providers: [PlayerRepository, PlayerService],
  exports: [PlayerRepository],
  controllers: [PlayerController],
})
export class PlayerModule {}
