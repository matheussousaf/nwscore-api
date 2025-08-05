import { PlayerService } from '@modules/player/application/services/player.service';
import { Controller, Get, Param } from '@nestjs/common';

@Controller('player')
export class PlayerController {
  constructor(private readonly playerService: PlayerService) {}

  @Get(':nickname')
  async findPlayerByNickname(@Param('nickname') nickname: string) {
    return this.playerService.findPlayerByNickname(nickname);
  }

  @Get(':nickname/:playerClass')
  async getPlayerClassStats(
    @Param('nickname') nickname: string,
    @Param('playerClass') playerClass: string,
  ) {
    return this.playerService.getPlayerClassStats(nickname, playerClass);
  }
}
