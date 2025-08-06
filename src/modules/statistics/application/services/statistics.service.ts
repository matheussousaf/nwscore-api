import { subDays } from 'date-fns';
import { PlayerRepository } from '@modules/player/domain/repositories/player.repository';
import { WarRepository } from '@modules/war/domain/repositories/war.repository';
import { Injectable } from '@nestjs/common';
import { RecentWarDto } from '../dtos/recent-wars.dto';
import { TrendingPlayerDto } from '../dtos/trending-players.dto';

@Injectable()
export class StatisticsService {
  constructor(
    private readonly warRepository: WarRepository,
    private readonly playerRepository: PlayerRepository,
  ) {}

  async getRecentWars(): Promise<RecentWarDto[]> {
    const TIME_RANGE = subDays(new Date(), 7);
    const WARS_LIMIT = 3;

    const recentWars = await this.warRepository.findRecentWars(
      TIME_RANGE,
      WARS_LIMIT,
    );

    return recentWars.map(
      ({ territory, id, startTime, attacker, defender, winner }) => ({
        warId: id,
        territory,
        startTime,
        winner,
        attackerName: attacker.name,
        defenderName: defender.name,
      }),
    );
  }

  async getTrendingPlayers(): Promise<TrendingPlayerDto[]> {
    const LIMIT_TRENDING_PLAYERS = 4;
    const trendingPlayers = await this.playerRepository.findTrendingPlayers(
      LIMIT_TRENDING_PLAYERS,
    );

    return trendingPlayers.map(
      ({ views, likes, rank, player, playerClass }) => ({
        nickname: player.nickname,
        playerId: player.id,
        playerClass,
        rank,
        views,
        likes,
      }),
    );
  }

  async getBestPerformances() {
    const LIMIT_BEST_PERFORMANCES = 4;
    const BEST_PERFORMANCES_DATE = subDays(new Date(), 7);

    const performances = await this.playerRepository.findBestPerformances(
      BEST_PERFORMANCES_DATE,
      LIMIT_BEST_PERFORMANCES,
    );

    return performances.map(
      ({ nickname, playerClass, score, rank, playerId }) => ({
        nickname,
        playerClass,
        score,
        rank,
        playerId,
      }),
    );
  }

  async getTopPerformers() {
    const LIMIT_TOP_PERFORMERS = 4;
    const MINIMUN_GAMES = 10;

    console.log('entered here');

    return await this.playerRepository.getBestPerformers(
      LIMIT_TOP_PERFORMERS,
      MINIMUN_GAMES,
    );
  }
}
