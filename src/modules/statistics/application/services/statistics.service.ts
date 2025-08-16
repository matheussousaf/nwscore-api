import { subDays } from 'date-fns';
import { PlayerRepository } from '@modules/player/domain/repositories/player.repository';
import { WarRepository } from '@modules/war/domain/repositories/war.repository';
import { Injectable } from '@nestjs/common';
import { RecentWarDto } from '../dtos/recent-wars.dto';
import { TrendingPlayerDto } from '../dtos/trending-players.dto';
import { PaginatedLeaderboardWinRateDto } from '../dtos/leaderboard-winrate.dto';
import { PaginatedLeaderboardMostWinsDto } from '../dtos/leaderboard-most-wins.dto';
import { PaginatedLeaderboardLeastDeathsDto } from '../dtos/leaderboard-least-deaths.dto';
import { PaginatedLeaderboardMostKillsDto } from '../dtos/leaderboard-most-kills.dto';
import { PaginatedLeaderboardMostAssistsDto } from '../dtos/leaderboard-most-assists.dto';
import { LeaderboardService } from './leaderboard.service';

@Injectable()
export class StatisticsService {
  constructor(
    private readonly playerRepository: PlayerRepository,
    private readonly warRepository: WarRepository,
    private readonly leaderboardService: LeaderboardService,
  ) {}

  async getRecentWars(): Promise<RecentWarDto[]> {
    const recentWars = await this.warRepository.findRecentWars(
      subDays(new Date(), 7),
      5,
    );

    return recentWars.map(
      ({ id, territory, startTime, winner, attacker, defender }) => ({
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

    // Get top players by win rate from Redis (as a proxy for trending)
    const result = await this.leaderboardService.getWinRateLeaderboard(
      1,
      LIMIT_TRENDING_PLAYERS * 2, // Get more results to account for deduplication
    );

    // Enrich with player data
    const trendingPlayers = await Promise.all(
      result.data.map(async (item) => {
        const player = await this.playerRepository.findPlayerById(
          item.playerId,
        );

        // Get the player's overall rank for this class
        const overallRank = await this.getPlayerOverallRank(
          item.playerId,
          item.mainClass,
        );

        return {
          nickname: player?.nickname || 'Unknown',
          playerId: item.playerId,
          playerClass: item.mainClass,
          rank: overallRank, // Use overall rank based on averageScore
          views: player?.PlayerProfile?.[0]?.views || 0, // Use actual profile views
          likes: player?.PlayerProfile?.[0]?.likes || 0, // Use actual profile likes
        };
      }),
    );

    // Deduplicate players by playerId, keeping the first occurrence (best winrate)
    const seenPlayers = new Set<string>();
    const uniqueTrendingPlayers = trendingPlayers.filter((player) => {
      if (seenPlayers.has(player.playerId)) {
        return false;
      }
      seenPlayers.add(player.playerId);
      return true;
    });

    // Return only the requested limit
    return uniqueTrendingPlayers.slice(0, LIMIT_TRENDING_PLAYERS);
  }

  async getBestPerformances() {
    const LIMIT_BEST_PERFORMANCES = 4;

    // Get top players by average score from Redis (ordered by avgScore)
    const result = await this.leaderboardService.getAverageScoreLeaderboard(
      1,
      LIMIT_BEST_PERFORMANCES,
    );

    // Enrich with player data (already ordered by avgScore from Redis)
    const bestPerformances = await Promise.all(
      result.data.map(async (item) => {
        const player = await this.playerRepository.findPlayerById(
          item.playerId,
        );

        // Get the player's overall rank for this class
        const overallRank = await this.getPlayerOverallRank(
          item.playerId,
          item.mainClass,
        );

        return {
          nickname: player?.nickname || 'Unknown',
          playerId: item.playerId,
          playerClass: item.mainClass,
          score: item.averageScore, // Use the score from the leaderboard
          rank: overallRank, // Use overall rank based on averageScore
        };
      }),
    );

    return bestPerformances;
  }

  async getTopPerformers() {
    const LIMIT_TOP_PERFORMERS = 4;

    // Get top players by average score from Redis (ordered by avgScore)
    const result = await this.leaderboardService.getAverageScoreLeaderboard(
      1,
      LIMIT_TOP_PERFORMERS,
    );

    // Enrich with player data (already ordered by avgScore from Redis)
    const topPerformers = await Promise.all(
      result.data.map(async (item) => {
        const player = await this.playerRepository.findPlayerById(
          item.playerId,
        );

        // Get the player's overall rank for this class
        const overallRank = await this.getPlayerOverallRank(
          item.playerId,
          item.mainClass,
        );

        return {
          nickname: player?.nickname || 'Unknown',
          playerClass: item.mainClass,
          playerId: item.playerId,
          averageScore: item.averageScore, // Use the score from the leaderboard
          rank: overallRank, // Use overall rank based on averageScore
        };
      }),
    );

    return topPerformers;
  }

  // Redis-based leaderboard methods
  async getLeaderboardWinRate(
    page: number = 1,
    limit: number = 10,
    minGames: number = 1,
    world?: string,
    playerClass?: string,
  ): Promise<PaginatedLeaderboardWinRateDto> {
    const result = await this.leaderboardService.getWinRateLeaderboard(
      page,
      limit,
      world,
      playerClass,
    );

    // Filter by minimum games and enrich with player data
    const enrichedData = await Promise.all(
      result.data.map(async (item) => {
        const playerStats = await this.leaderboardService.getPlayerStats(
          item.playerId,
          item.mainClass,
        );

        // Get player nickname from database using ID
        const player = await this.playerRepository.findPlayerById(
          item.playerId,
        );

        return {
          ...item,
          winrate: playerStats?.winRate,
          nickname: player?.nickname || 'Unknown',
          world: player?.world,
          totalGames: playerStats?.gamesPlayed || 0,
        };
      }),
    );

    // Filter by minimum games
    const filteredData = enrichedData.filter(
      (item) => item.totalGames >= minGames,
    );

    return {
      page: result.page,
      limit: result.limit,
      total: filteredData.length,
      totalPages: Math.ceil(filteredData.length / limit),
      data: filteredData,
    };
  }

  async getLeaderboardMostWins(
    page: number = 1,
    limit: number = 10,
    world?: string,
    playerClass?: string,
  ): Promise<PaginatedLeaderboardMostWinsDto> {
    // Use the existing repository method that has proper win streak calculation
    const result = await this.playerRepository.getMostWinsLeaderboard(
      page,
      limit,
      1, // minGames
      world,
      playerClass,
    );

    return {
      page,
      limit,
      total: result.total,
      totalPages: Math.ceil(result.total / limit),
      data: result.data,
    };
  }

  async getLeaderboardLeastDeaths(
    page: number = 1,
    limit: number = 10,
    world?: string,
    playerClass?: string,
  ): Promise<PaginatedLeaderboardLeastDeathsDto> {
    const result = await this.leaderboardService.getLeastDeathsLeaderboard(
      page,
      limit,
      world,
      playerClass,
    );

    // Enrich with player data
    const enrichedData = await Promise.all(
      result.data.map(async (item) => {
        const playerStats = await this.leaderboardService.getPlayerStats(
          item.playerId,
          item.mainClass,
        );

        // Get player nickname from database using ID
        const player = await this.playerRepository.findPlayerById(
          item.playerId,
        );

        return {
          ...item,
          averageDeaths: playerStats?.avgDeaths,
          nickname: player?.nickname || 'Unknown',
          world: player?.world,
          totalDeaths: playerStats?.totalDeaths || 0,
        };
      }),
    );

    return {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
      data: enrichedData,
    };
  }

  async getLeaderboardMostKills(
    page: number = 1,
    limit: number = 10,
    world?: string,
    playerClass?: string,
  ): Promise<PaginatedLeaderboardMostKillsDto> {
    const result = await this.leaderboardService.getMostKillsLeaderboard(
      page,
      limit,
      world,
      playerClass,
    );

    // Enrich with player data
    const enrichedData = await Promise.all(
      result.data.map(async (item) => {
        const playerStats = await this.leaderboardService.getPlayerStats(
          item.playerId,
          item.mainClass,
        );

        // Get player nickname from database using ID
        const player = await this.playerRepository.findPlayerById(
          item.playerId,
        );

        return {
          ...item,
          averageKills: playerStats?.avgKills,
          nickname: player?.nickname || 'Unknown',
          world: player?.world,
          totalKills: playerStats?.totalKills || 0,
        };
      }),
    );

    return {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
      data: enrichedData,
    };
  }

  async getLeaderboardMostAssists(
    page: number = 1,
    limit: number = 10,
    world?: string,
    playerClass?: string,
  ): Promise<PaginatedLeaderboardMostAssistsDto> {
    const result = await this.leaderboardService.getMostAssistsLeaderboard(
      page,
      limit,
      world,
      playerClass,
    );

    // Enrich with player data
    const enrichedData = await Promise.all(
      result.data.map(async (item) => {
        const playerStats = await this.leaderboardService.getPlayerStats(
          item.playerId,
          item.mainClass,
        );

        // Get player nickname from database using ID
        const player = await this.playerRepository.findPlayerById(
          item.playerId,
        );

        return {
          ...item,
          averageAssists: playerStats?.avgAssists,
          nickname: player?.nickname || 'Unknown',
          world: player?.world,
          totalAssists: playerStats?.totalAssists || 0,
        };
      }),
    );

    return {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
      data: enrichedData,
    };
  }

  // Helper method to get player's overall rank based on averageScore for their class
  private async getPlayerOverallRank(
    playerId: string,
    playerClass: string,
  ): Promise<number> {
    try {
      // Get all players with their average scores for this class
      const allPlayerStats =
        await this.leaderboardService.getAllPlayerStatsForClass(playerClass);

      // Sort by average score (descending) to get rankings
      const sortedPlayers = allPlayerStats
        .filter((stat) => stat.avgScore > 0) // Only include players with scores
        .sort((a, b) => b.avgScore - a.avgScore);

      // Find the player's position (1-based ranking)
      const playerIndex = sortedPlayers.findIndex(
        (stat) => stat.playerId === playerId,
      );

      return playerIndex >= 0 ? playerIndex + 1 : 999; // Return 999 if not found
    } catch (error) {
      console.error(
        `[StatisticsService] Error getting overall rank for ${playerId}:${playerClass}:`,
        error,
      );
      return 999; // Return high rank if error
    }
  }
}
