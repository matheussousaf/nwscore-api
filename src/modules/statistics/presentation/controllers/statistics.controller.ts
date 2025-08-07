import { Controller, Get, Query, Post } from '@nestjs/common';
import { StatisticsService } from '@modules/statistics/application/services/statistics.service';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { PaginatedLeaderboardWinRateDto } from '@modules/statistics/application/dtos/leaderboard-winrate.dto';
import { PaginatedLeaderboardMostWinsDto } from '@modules/statistics/application/dtos/leaderboard-most-wins.dto';
import { PaginatedLeaderboardLeastDeathsDto } from '@modules/statistics/application/dtos/leaderboard-least-deaths.dto';
import { PaginatedLeaderboardMostKillsDto } from '@modules/statistics/application/dtos/leaderboard-most-kills.dto';
import { PaginatedLeaderboardMostAssistsDto } from '@modules/statistics/application/dtos/leaderboard-most-assists.dto';
import { StatisticsDto } from '@modules/statistics/application/dtos/statistics.dto';
import { RedisLeaderboardService } from '@shared/services/redis-leaderboard.service';

@ApiTags('Statistics')
@Controller('statistics')
export class StatisticsController {
  constructor(
    private readonly statisticsService: StatisticsService,
    private readonly redisLeaderboardService: RedisLeaderboardService,
  ) {}

  @Get('home')
  @ApiOperation({ summary: 'Get home statistics' })
  async getHomeStatistics(): Promise<StatisticsDto> {
    const [recentWars, trendingPlayers, bestPerformances, topPerformers] =
      await Promise.all([
        this.statisticsService.getRecentWars(),
        this.statisticsService.getTrendingPlayers(),
        this.statisticsService.getBestPerformances(),
        this.statisticsService.getTopPerformers(),
      ]);

    return {
      recentWars,
      trendingPlayers,
      bestPerformances,
      topPerformers,
    };
  }

  @Post('redis/reset')
  @ApiOperation({ summary: 'Clear and reinitialize Redis data (DEBUG ONLY)' })
  async resetRedisData() {
    await this.redisLeaderboardService.clearAllLeaderboards();
    await this.redisLeaderboardService.initializeFromDatabase();
    return { message: 'Redis data cleared and reinitialized' };
  }

  @Get('leaderboard/win-rate')
  async getLeaderboardWinRate(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('minGames') minGames: string = '1',
    @Query('world') world?: string,
    @Query('class') playerClass?: string,
  ): Promise<PaginatedLeaderboardWinRateDto> {
    return this.statisticsService.getLeaderboardWinRate(
      parseInt(page, 10),
      parseInt(limit, 10),
      parseInt(minGames, 10),
      world,
      playerClass,
    );
  }

  @Get('leaderboard/most-wins')
  async getLeaderboardMostWins(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('world') world?: string,
    @Query('class') playerClass?: string,
  ): Promise<PaginatedLeaderboardMostWinsDto> {
    return this.statisticsService.getLeaderboardMostWins(
      parseInt(page, 10),
      parseInt(limit, 10),
      world,
      playerClass,
    );
  }

  @Get('leaderboard/least-deaths')
  async getLeaderboardLeastDeaths(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('world') world?: string,
    @Query('class') playerClass?: string,
  ): Promise<PaginatedLeaderboardLeastDeathsDto> {
    return this.statisticsService.getLeaderboardLeastDeaths(
      parseInt(page, 10),
      parseInt(limit, 10),
      world,
      playerClass,
    );
  }

  @Get('leaderboard/most-kills')
  async getLeaderboardMostKills(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('world') world?: string,
    @Query('class') playerClass?: string,
  ): Promise<PaginatedLeaderboardMostKillsDto> {
    return this.statisticsService.getLeaderboardMostKills(
      parseInt(page, 10),
      parseInt(limit, 10),
      world,
      playerClass,
    );
  }

  @Get('leaderboard/most-assists')
  async getLeaderboardMostAssists(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('world') world?: string,
    @Query('class') playerClass?: string,
  ): Promise<PaginatedLeaderboardMostAssistsDto> {
    return this.statisticsService.getLeaderboardMostAssists(
      parseInt(page, 10),
      parseInt(limit, 10),
      world,
      playerClass,
    );
  }
}
