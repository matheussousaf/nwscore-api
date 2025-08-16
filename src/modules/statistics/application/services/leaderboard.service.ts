import { Injectable, OnModuleInit } from '@nestjs/common';
import { RedisService } from '@shared/services/redis/redis.service';
import { PrismaService } from '@shared/services/prisma/prisma.service';
import { InternalLoggerService } from '@shared/services/logger/internal-logger.service';
import { PlayerPerformance } from '@modules/statistics/domain/interfaces/player-performance.interface';
import { PlayerStats } from '@modules/statistics/domain/interfaces/player-stats.interface';
import { LeaderboardEntry } from '@modules/statistics/domain/interfaces/leaderboard-entry.interface';
import { LeaderboardResponse } from '@modules/statistics/domain/interfaces/leaderboard-response.interface';

@Injectable()
export class LeaderboardService implements OnModuleInit {
  constructor(
    private readonly redisService: RedisService,
    private readonly prisma: PrismaService,
    private readonly logger: InternalLoggerService,
  ) {}

  async onModuleInit() {
    // Check if Redis has data, if not, try to recover from database
    await this.checkAndRecoverData();
  }

  // Check if Redis has data and recover from database if needed
  private async checkAndRecoverData() {
    try {
      // Check if any leaderboard keys exist
      const keys = await this.redisService.keys('leaderboard:*');

      if (keys.length === 0) {
        this.logger.log(
          'No leaderboard data found in Redis, checking database...',
        );

        // Check if database has performance data
        const performanceCount = await this.prisma.playerPerformance.count();

        if (performanceCount > 0) {
          this.logger.log(
            `Found ${performanceCount} performances in database, rebuilding Redis...`,
          );
          await this.initializeFromDatabase();
        } else {
          this.logger.log(
            'No performance data in database, Redis will be populated as new wars are uploaded',
          );
        }
      } else {
        this.logger.log(`Found ${keys.length} leaderboard keys in Redis`);
      }
    } catch (error) {
      this.logger.error('Error checking/recovering data:', error);
    }
  }

  // Key generation helpers
  private getWinRateKey(world?: string, playerClass?: string): string {
    const parts = ['leaderboard:winrate'];
    if (world) parts.push(`world:${world}`);
    if (playerClass) parts.push(`class:${playerClass}`);
    return parts.join(':');
  }

  private getMostWinsKey(world?: string, playerClass?: string): string {
    const parts = ['leaderboard:mostwins'];
    if (world) parts.push(`world:${world}`);
    if (playerClass) parts.push(`class:${playerClass}`);
    return parts.join(':');
  }

  private getLeastDeathsKey(world?: string, playerClass?: string): string {
    const parts = ['leaderboard:leastdeaths'];
    if (world) parts.push(`world:${world}`);
    if (playerClass) parts.push(`class:${playerClass}`);
    return parts.join(':');
  }

  private getMostKillsKey(world?: string, playerClass?: string): string {
    const parts = ['leaderboard:mostkills'];
    if (world) parts.push(`world:${world}`);
    if (playerClass) parts.push(`class:${playerClass}`);
    return parts.join(':');
  }

  private getMostAssistsKey(world?: string, playerClass?: string): string {
    const parts = ['leaderboard:mostassists'];
    if (world) parts.push(`world:${world}`);
    if (playerClass) parts.push(`class:${playerClass}`);
    return parts.join(':');
  }

  private getAverageScoreKey(world?: string, playerClass?: string): string {
    const parts = ['leaderboard:averagescore'];
    if (world) parts.push(`world:${world}`);
    if (playerClass) parts.push(`class:${playerClass}`);
    return parts.join(':');
  }

  private getPlayerStatsKey(playerId: string, playerClass: string): string {
    return `player:${playerId}:class:${playerClass}:stats`;
  }

  // Update player statistics when a new performance is added
  async updatePlayerStats(performance: PlayerPerformance) {
    const statsKey = this.getPlayerStatsKey(
      performance.playerId,
      performance.playerClass,
    );

    try {
      // Use Redis pipeline for atomic operations
      const pipeline = this.redisService.createPipeline();

      // Increment counters atomically
      pipeline.hIncrBy(statsKey, 'gamesPlayed', 1);
      pipeline.hIncrByFloat(statsKey, 'totalScore', performance.score);
      pipeline.hIncrBy(statsKey, 'totalKills', performance.kills);
      pipeline.hIncrBy(statsKey, 'totalDeaths', performance.deaths);
      pipeline.hIncrBy(statsKey, 'totalAssists', performance.assists);
      if (performance.win) {
        pipeline.hIncrBy(statsKey, 'wins', 1);
      }

      // Execute pipeline
      await pipeline.exec();

      // Get updated stats and calculate averages
      const stats = await this.redisService.hGetAll(statsKey);
      const updatedStats = this.calculateAverages(stats);

      // Update averages and leaderboards
      await this.updateAveragesAndLeaderboards(
        performance.playerId,
        performance.playerClass,
        updatedStats,
      );

      this.logger.log(
        `Updated stats for player ${performance.playerId}, class ${performance.playerClass}`,
      );
    } catch (error) {
      this.logger.error(`Error updating player stats:`, error);
    }
  }

  // Update multiple player performances (optimized)
  async updatePlayerStatsBatch(performances: PlayerPerformance[]) {
    this.logger.log(
      `Starting batch update for ${performances.length} performances`,
    );

    // Process in background without blocking the main thread
    setImmediate(async () => {
      try {
        await this.processPerformancesInBatches(performances);
        this.logger.log(
          `Completed batch update for ${performances.length} performances`,
        );
      } catch (error) {
        this.logger.error('Error in background processing:', error);
      }
    });
  }

  // Process performances in optimized batches
  private async processPerformancesInBatches(
    performances: PlayerPerformance[],
  ) {
    // Group performances by player-class to avoid duplicate processing
    const playerClassMap = new Map<
      string,
      {
        playerId: string;
        playerClass: string;
        totalScore: number;
        totalKills: number;
        totalDeaths: number;
        totalAssists: number;
        gamesPlayed: number;
        wins: number;
      }
    >();

    // Aggregate performances by player-class
    for (const perf of performances) {
      const key = `${perf.playerId}:${perf.playerClass}`;
      const existing = playerClassMap.get(key) || {
        playerId: perf.playerId,
        playerClass: perf.playerClass,
        totalScore: 0,
        totalKills: 0,
        totalDeaths: 0,
        totalAssists: 0,
        gamesPlayed: 0,
        wins: 0,
      };

      existing.totalScore += perf.score;
      existing.totalKills += perf.kills;
      existing.totalDeaths += perf.deaths;
      existing.totalAssists += perf.assists;
      existing.gamesPlayed += 1;
      existing.wins += perf.win ? 1 : 0;

      playerClassMap.set(key, existing);
    }

    // Process aggregated data in batches
    const aggregatedPerformances = Array.from(playerClassMap.values());
    const batchSize = 20;

    for (let i = 0; i < aggregatedPerformances.length; i += batchSize) {
      const batch = aggregatedPerformances.slice(i, i + batchSize);

      // Process batch in parallel
      await Promise.all(
        batch.map(async (aggPerf) => {
          const statsKey = this.getPlayerStatsKey(
            aggPerf.playerId,
            aggPerf.playerClass,
          );

          try {
            // Use pipeline for atomic operations
            const pipeline = this.redisService.createPipeline();

            // Increment counters
            pipeline.hIncrBy(statsKey, 'gamesPlayed', aggPerf.gamesPlayed);
            pipeline.hIncrByFloat(statsKey, 'totalScore', aggPerf.totalScore);
            pipeline.hIncrBy(statsKey, 'totalKills', aggPerf.totalKills);
            pipeline.hIncrBy(statsKey, 'totalDeaths', aggPerf.totalDeaths);
            pipeline.hIncrBy(statsKey, 'totalAssists', aggPerf.totalAssists);
            pipeline.hIncrBy(statsKey, 'wins', aggPerf.wins);

            await pipeline.exec();

            // Get updated stats and update averages/leaderboards
            const stats = await this.redisService.hGetAll(statsKey);
            const updatedStats = this.calculateAverages(stats);

            await this.updateAveragesAndLeaderboards(
              aggPerf.playerId,
              aggPerf.playerClass,
              updatedStats,
            );
          } catch (error) {
            this.logger.error(
              `Error processing ${aggPerf.playerId}:${aggPerf.playerClass}:`,
              error,
            );
          }
        }),
      );

      // Minimal delay between batches
      if (i + batchSize < aggregatedPerformances.length) {
        await new Promise((resolve) => setTimeout(resolve, 5));
      }
    }
  }

  // Calculate averages from raw stats
  private calculateAverages(stats: Record<string, string>): PlayerStats {
    const gamesPlayed = parseInt(stats.gamesPlayed || '1');
    const totalScore = parseFloat(stats.totalScore || '0');
    const totalKills = parseInt(stats.totalKills || '0');
    const totalDeaths = parseInt(stats.totalDeaths || '0');
    const totalAssists = parseInt(stats.totalAssists || '0');
    const wins = parseInt(stats.wins || '0');

    return {
      gamesPlayed,
      totalScore,
      totalKills,
      totalDeaths,
      totalAssists,
      wins,
      avgScore: totalScore / gamesPlayed,
      avgKills: totalKills / gamesPlayed,
      avgDeaths: totalDeaths / gamesPlayed,
      avgAssists: totalAssists / gamesPlayed,
      winRate: (wins / gamesPlayed) * 100,
      lastUpdated: new Date().toISOString(),
    };
  }

  // Update averages and leaderboards
  private async updateAveragesAndLeaderboards(
    playerId: string,
    playerClass: string,
    stats: PlayerStats,
  ) {
    const statsKey = this.getPlayerStatsKey(playerId, playerClass);
    const playerData = JSON.stringify({
      playerId,
      playerClass,
      nickname: '', // Will be filled by the calling service
    });

    await Promise.all([
      // Update averages
      this.redisService.hSetMultiple(statsKey, {
        avgScore: stats.avgScore.toString(),
        avgKills: stats.avgKills.toString(),
        avgDeaths: stats.avgDeaths.toString(),
        avgAssists: stats.avgAssists.toString(),
        winRate: stats.winRate.toString(),
        lastUpdated: stats.lastUpdated,
      }),
      // Update leaderboards in parallel
      this.redisService.zAdd(this.getWinRateKey(), stats.winRate, playerData),
      this.redisService.zAdd(this.getMostWinsKey(), stats.wins, playerData),
      this.redisService.zAdd(
        this.getLeastDeathsKey(),
        -stats.avgDeaths,
        playerData,
      ), // Negative so lower deaths rank higher
      this.redisService.zAdd(
        this.getMostKillsKey(),
        stats.avgKills,
        playerData,
      ),
      this.redisService.zAdd(
        this.getMostAssistsKey(),
        stats.avgAssists,
        playerData,
      ),
      this.redisService.zAdd(
        this.getAverageScoreKey(),
        stats.avgScore,
        playerData,
      ),
    ]);
  }

  // Get leaderboard data
  async getWinRateLeaderboard(
    page: number = 1,
    limit: number = 10,
    world?: string,
    playerClass?: string,
  ): Promise<LeaderboardResponse> {
    const key = this.getWinRateKey(world, playerClass);
    return await this.getLeaderboard(key, page, limit, 'winrate');
  }

  async getMostWinsLeaderboard(
    page: number = 1,
    limit: number = 10,
    world?: string,
    playerClass?: string,
  ): Promise<LeaderboardResponse> {
    const key = this.getMostWinsKey(world, playerClass);
    return await this.getLeaderboard(key, page, limit, 'mostWins');
  }

  async getLeastDeathsLeaderboard(
    page: number = 1,
    limit: number = 10,
    world?: string,
    playerClass?: string,
  ): Promise<LeaderboardResponse> {
    const key = this.getLeastDeathsKey(world, playerClass);
    return await this.getLeaderboard(key, page, limit, 'averageDeaths', true);
  }

  async getMostKillsLeaderboard(
    page: number = 1,
    limit: number = 10,
    world?: string,
    playerClass?: string,
  ): Promise<LeaderboardResponse> {
    const key = this.getMostKillsKey(world, playerClass);
    return await this.getLeaderboard(key, page, limit, 'averageKills');
  }

  async getMostAssistsLeaderboard(
    page: number = 1,
    limit: number = 10,
    world?: string,
    playerClass?: string,
  ): Promise<LeaderboardResponse> {
    const key = this.getMostAssistsKey(world, playerClass);
    return await this.getLeaderboard(key, page, limit, 'averageAssists');
  }

  async getAverageScoreLeaderboard(
    page: number = 1,
    limit: number = 10,
    world?: string,
    playerClass?: string,
  ): Promise<LeaderboardResponse> {
    const key = this.getAverageScoreKey(world, playerClass);
    return await this.getLeaderboard(key, page, limit, 'averageScore');
  }

  // Generic leaderboard retrieval
  private async getLeaderboard(
    key: string,
    page: number,
    limit: number,
    scoreField: string,
    invertScore: boolean = false,
  ): Promise<LeaderboardResponse> {
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    const [total, rankings] = await Promise.all([
      this.redisService.zCard(key),
      this.redisService.zRangeWithScores(key, start, end, { REV: true }),
    ]);

    return {
      data: rankings.map((item, index) => {
        const player = JSON.parse(item.value);
        const score = invertScore ? -item.score : item.score;

        return {
          playerId: player.playerId,
          mainClass: player.playerClass,
          nickname: player.nickname,
          [scoreField]: score,
          rank: start + index + 1,
        } as LeaderboardEntry & Record<string, any>;
      }),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Get player stats
  async getPlayerStats(
    playerId: string,
    playerClass: string,
  ): Promise<PlayerStats | null> {
    const statsKey = this.getPlayerStatsKey(playerId, playerClass);
    const stats = await this.redisService.hGetAll(statsKey);

    if (!stats.gamesPlayed) {
      return null;
    }

    return this.calculateAverages(stats);
  }

  // Get all player stats for a specific class (for ranking calculations)
  async getAllPlayerStatsForClass(playerClass: string): Promise<PlayerStats[]> {
    try {
      // Get all keys for this class
      const pattern = `player:*:class:${playerClass}:stats`;
      const keys = await this.redisService.keys(pattern);

      if (keys.length === 0) {
        return [];
      }

      // Get stats for all players in this class
      const playerStats = await Promise.all(
        keys.map(async (key) => {
          const stats = await this.redisService.hGetAll(key);

          if (!stats.gamesPlayed || parseInt(stats.gamesPlayed) === 0) {
            return null;
          }

          // Extract playerId from key (format: player:playerId:class:playerClass:stats)
          const playerId = key.split(':')[1];

          return {
            playerId,
            playerClass,
            ...this.calculateAverages(stats),
          };
        }),
      );

      // Filter out null entries and return valid stats
      return playerStats.filter((stat) => stat !== null) as PlayerStats[];
    } catch (error) {
      this.logger.error(
        `Error getting all player stats for class ${playerClass}:`,
        error,
      );
      return [];
    }
  }

  // Clear all leaderboards (useful for testing or reset)
  async clearAllLeaderboards(): Promise<void> {
    const keys = await this.redisService.keys('leaderboard:*');
    if (keys.length > 0) {
      await Promise.all(keys.map((key) => this.redisService.del(key)));
    }
    this.logger.log('Cleared all leaderboards');
  }

  // Reset Redis data for specific players (for war rollback)
  async resetPlayerData(
    players: Array<{ playerId: string; playerClass: string }>,
  ): Promise<void> {
    this.logger.log(`Resetting Redis data for ${players.length} players`);

    try {
      // Get all player stats keys to delete
      const playerStatsKeys = players.map((p) =>
        this.getPlayerStatsKey(p.playerId, p.playerClass),
      );

      // Delete player stats
      if (playerStatsKeys.length > 0) {
        await Promise.all(
          playerStatsKeys.map((key) => this.redisService.del(key)),
        );
      }

      // Remove players from all leaderboards
      const leaderboardKeys = [
        this.getWinRateKey(),
        this.getMostWinsKey(),
        this.getLeastDeathsKey(),
        this.getMostKillsKey(),
        this.getMostAssistsKey(),
        this.getAverageScoreKey(),
      ];

      for (const leaderboardKey of leaderboardKeys) {
        for (const player of players) {
          const playerData = JSON.stringify({
            playerId: player.playerId,
            playerClass: player.playerClass,
            nickname: '',
          });

          await this.redisService.zRem(leaderboardKey, playerData);
        }
      }

      this.logger.log(
        `Successfully reset Redis data for ${players.length} players`,
      );
    } catch (error) {
      this.logger.error('Error resetting player data:', error);
      throw error;
    }
  }

  // Initialize leaderboards from existing database data
  async initializeFromDatabase(): Promise<void> {
    try {
      this.logger.log('Initializing from database...');

      // Get all player performances from the database
      const performances = await this.prisma.playerPerformance.findMany({
        include: {
          player: true,
        },
      });

      if (performances.length === 0) {
        this.logger.log('No performances found in database');
        return;
      }

      // Transform to our format
      const playerPerformances: PlayerPerformance[] = performances.map(
        (perf) => ({
          playerId: perf.playerId,
          playerClass: perf.playerClass,
          score: perf.score,
          kills: perf.kills,
          deaths: perf.deaths,
          assists: perf.assists,
          win: perf.win,
        }),
      );

      // Use batch processing for initialization
      await this.updatePlayerStatsBatch(playerPerformances);

      this.logger.log(
        `Initialized leaderboards from ${performances.length} performances`,
      );
    } catch (error) {
      this.logger.error('Error initializing from database:', error);
    }
  }
}
