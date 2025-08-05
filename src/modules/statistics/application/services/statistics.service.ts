import { subDays } from 'date-fns';
import { PlayerRepository } from '@modules/player/domain/repositories/player.repository';
import { WarRepository } from '@modules/war/domain/repositories/war.repository';
import { Injectable } from '@nestjs/common';

@Injectable()
export class StatisticsService {
  constructor(
    private readonly warRepository: WarRepository,
    private readonly playerRepository: PlayerRepository,
  ) {}

  async recentWars() {
    const TIME_RANGE = subDays(new Date(), 7);
    const WARS_LIMIT = 3;

    return await this.warRepository.findRecentWars(TIME_RANGE, WARS_LIMIT);
  }

  async trendingPlayers() {
    const LIMIT_TRENDING_PLAYERS = 4;
    const trendingPlayers = await this.playerRepository.findTrendingPlayers(
      LIMIT_TRENDING_PLAYERS,
    );

    return trendingPlayers;
  }

  async bestPerformances() {
    const LIMIT_BEST_PERFORMANCES = 4;
    const BEST_PERFORMANCES_DATE = subDays(new Date(), 7);

    return await this.playerRepository.findBestPerformances(
      BEST_PERFORMANCES_DATE,
      LIMIT_BEST_PERFORMANCES,
    );
  }

  topPlayers() {
    // TODO: Implement this method
    return [];
  }
}
