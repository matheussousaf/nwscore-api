import { PlayerService } from '@modules/player/application/services/player.service';
import { Controller, Get, Query } from '@nestjs/common';
import { PaginatedSearchPlayersDto } from '@modules/player/application/dtos/search-players.dto';

@Controller('player')
export class PlayerController {
  constructor(private readonly playerService: PlayerService) {}

  @Get()
  async findPlayerByNickname(@Query('nickname') nickname: string) {
    console.log('entered here', nickname);
    return this.playerService.findPlayerByNickname(nickname);
  }

  @Get('search')
  async searchPlayers(
    @Query('query') query?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ): Promise<PaginatedSearchPlayersDto> {
    return this.playerService.searchPlayers(
      query,
      parseInt(page, 10),
      parseInt(limit, 10),
    );
  }
}
