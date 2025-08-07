import { Injectable, OnModuleInit } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { createClient, RedisClientType } from 'redis';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class RedisLeaderboardService implements OnModuleInit {
  private redisClient: RedisClientType;

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly prisma: PrismaService,
  ) {
    this.redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });
  }

  async onModuleInit() {
    await this.redisClient.connect();
    console.log('[RedisLeaderboard] Connected to Redis');

    // Check if Redis has data, if not, try to recover from database
    await this.checkAndRecoverData();
  }

  // Check if Redis has data and recover from database if needed
  private async checkAndRecoverData() {
    try {
      // Check if any leaderboard keys exist
      const keys = await this.redisClient.keys('leaderboard:*');

      if (keys.length === 0) {
        console.log(
          '[RedisLeaderboard] No leaderboard data found in Redis, checking database...',
        );

        // Check if database has performance data
        const performanceCount = await this.prisma.playerPerformance.count();

        if (performanceCount > 0) {
          console.log(
            `[RedisLeaderboard] Found ${performanceCount} performances in database, rebuilding Redis...`,
          );
          await this.initializeFromDatabase();
        } else {
          console.log(
            '[RedisLeaderboard] No performance data in database, Redis will be populated as new wars are uploaded',
          );
        }
      } else {
        console.log(
          `[RedisLeaderboard] Found ${keys.length} leaderboard keys in Redis`,
        );
      }
    } catch (error) {
      console.error(
        '[RedisLeaderboard] Error checking/recovering data:',
        error,
      );
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
  async updatePlayerStats(
    playerId: string,
    playerClass: string,
    score: number,
    kills: number,
    deaths: number,
    assists: number,
    win: boolean,
  ) {
    const statsKey = this.getPlayerStatsKey(playerId, playerClass);

    try {
      // Get current stats
      const currentStats = await this.redisClient.hGetAll(statsKey);

      const gamesPlayed = parseInt(currentStats.gamesPlayed || '0') + 1;
      const totalScore = parseFloat(currentStats.totalScore || '0') + score;
      const totalKills = parseInt(currentStats.totalKills || '0') + kills;
      const totalDeaths = parseInt(currentStats.totalDeaths || '0') + deaths;
      const totalAssists = parseInt(currentStats.totalAssists || '0') + assists;
      const wins = parseInt(currentStats.wins || '0') + (win ? 1 : 0);

      const avgScore = totalScore / gamesPlayed;
      const avgKills = totalKills / gamesPlayed;
      const avgDeaths = totalDeaths / gamesPlayed;
      const avgAssists = totalAssists / gamesPlayed;
      const winRate = (wins / gamesPlayed) * 100;

      // Update player stats hash
      await this.redisClient.hSet(statsKey, {
        gamesPlayed: gamesPlayed.toString(),
        totalScore: totalScore.toString(),
        totalKills: totalKills.toString(),
        totalDeaths: totalDeaths.toString(),
        totalAssists: totalAssists.toString(),
        wins: wins.toString(),
        avgScore: avgScore.toString(),
        avgKills: avgKills.toString(),
        avgDeaths: avgDeaths.toString(),
        avgAssists: avgAssists.toString(),
        winRate: winRate.toString(),
        lastUpdated: new Date().toISOString(),
      });

      // Update leaderboards
      await this.updateLeaderboards(playerId, playerClass, {
        winRate,
        wins,
        avgDeaths,
        avgKills,
        avgAssists,
        totalKills,
        totalDeaths,
        totalAssists,
      });

      console.log(
        `[RedisLeaderboard] Updated stats for player ${playerId}, class ${playerClass}`,
      );
    } catch (error) {
      console.error(`[RedisLeaderboard] Error updating player stats:`, error);
    }
  }

  // Update all leaderboards for a player
  private async updateLeaderboards(
    playerId: string,
    playerClass: string,
    stats: {
      winRate: number;
      wins: number;
      avgDeaths: number;
      avgKills: number;
      avgAssists: number;
      totalKills: number;
      totalDeaths: number;
      totalAssists: number;
    },
  ) {
    const playerData = JSON.stringify({
      playerId,
      playerClass,
      nickname: '', // Will be filled by the calling service
    });

    // Update win rate leaderboard (higher is better)
    await this.redisClient.zAdd(this.getWinRateKey(), {
      score: stats.winRate,
      value: playerData,
    });

    // Update most wins leaderboard (higher is better)
    await this.redisClient.zAdd(this.getMostWinsKey(), {
      score: stats.wins,
      value: playerData,
    });

    // Update least deaths leaderboard (lower is better, so we use negative score)
    await this.redisClient.zAdd(this.getLeastDeathsKey(), {
      score: -stats.avgDeaths, // Negative so lower deaths rank higher
      value: playerData,
    });

    // Update most kills leaderboard (higher is better)
    await this.redisClient.zAdd(this.getMostKillsKey(), {
      score: stats.avgKills,
      value: playerData,
    });

    // Update most assists leaderboard (higher is better)
    await this.redisClient.zAdd(this.getMostAssistsKey(), {
      score: stats.avgAssists,
      value: playerData,
    });

    // Update average score leaderboard (higher is better)
    // We need to get the avgScore from the player stats
    const statsKey = this.getPlayerStatsKey(playerId, playerClass);
    const playerStats = await this.redisClient.hGetAll(statsKey);
    const avgScore = parseFloat(playerStats.avgScore || '0');
    
    await this.redisClient.zAdd(this.getAverageScoreKey(), {
      score: avgScore,
      value: playerData,
    });
  }

  // Get leaderboard data
  async getWinRateLeaderboard(
    page: number = 1,
    limit: number = 10,
    world?: string,
    playerClass?: string,
  ) {
    const key = this.getWinRateKey(world, playerClass);
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    const [total, rankings] = await Promise.all([
      this.redisClient.zCard(key),
      this.redisClient.zRangeWithScores(key, start, end, { REV: true }),
    ]);

    return {
      data: rankings.map((item, index) => {
        const player = JSON.parse(item.value);
        return {
          playerId: player.playerId,
          mainClass: player.playerClass,
          nickname: player.nickname,
          winrate: item.score,
          totalGames: 0, // Would need to be fetched from player stats
          rank: start + index + 1,
        };
      }),
      total: total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getMostWinsLeaderboard(
    page: number = 1,
    limit: number = 10,
    world?: string,
    playerClass?: string,
  ) {
    const key = this.getMostWinsKey(world, playerClass);
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    const [total, rankings] = await Promise.all([
      this.redisClient.zCard(key),
      this.redisClient.zRangeWithScores(key, start, end, { REV: true }),
    ]);

    return {
      data: rankings.map((item, index) => {
        const player = JSON.parse(item.value);
        return {
          playerId: player.playerId,
          mainClass: player.playerClass,
          nickname: player.nickname,
          mostWins: item.score,
          winStreak: 0, // Would need separate tracking
          rank: start + index + 1,
        };
      }),
      total: total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getLeastDeathsLeaderboard(
    page: number = 1,
    limit: number = 10,
    world?: string,
    playerClass?: string,
  ) {
    const key = this.getLeastDeathsKey(world, playerClass);
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    const [total, rankings] = await Promise.all([
      this.redisClient.zCard(key),
      this.redisClient.zRangeWithScores(key, start, end, { REV: true }),
    ]);

    return {
      data: rankings.map((item, index) => {
        const player = JSON.parse(item.value);
        return {
          playerId: player.playerId,
          mainClass: player.playerClass,
          nickname: player.nickname,
          averageDeaths: -item.score, // Convert back from negative
          totalDeaths: 0, // Would need to be fetched from player stats
          rank: start + index + 1,
        };
      }),
      total: total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getMostKillsLeaderboard(
    page: number = 1,
    limit: number = 10,
    world?: string,
    playerClass?: string,
  ) {
    const key = this.getMostKillsKey(world, playerClass);
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    const [total, rankings] = await Promise.all([
      this.redisClient.zCard(key),
      this.redisClient.zRangeWithScores(key, start, end, { REV: true }),
    ]);

    return {
      data: rankings.map((item, index) => {
        const player = JSON.parse(item.value);
        return {
          playerId: player.playerId,
          mainClass: player.playerClass,
          nickname: player.nickname,
          averageKills: item.score,
          totalKills: 0, // Would need to be fetched from player stats
          rank: start + index + 1,
        };
      }),
      total: total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getMostAssistsLeaderboard(
    page: number = 1,
    limit: number = 10,
    world?: string,
    playerClass?: string,
  ) {
    const key = this.getMostAssistsKey(world, playerClass);
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    const [total, rankings] = await Promise.all([
      this.redisClient.zCard(key),
      this.redisClient.zRangeWithScores(key, start, end, { REV: true }),
    ]);

    return {
      data: rankings.map((item, index) => {
        const player = JSON.parse(item.value);
        return {
          playerId: player.playerId,
          mainClass: player.playerClass,
          nickname: player.nickname,
          averageAssists: item.score,
          totalAssists: 0, // Would need to be fetched from player stats
          rank: start + index + 1,
        };
      }),
      total: total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getAverageScoreLeaderboard(
    page: number = 1,
    limit: number = 10,
    world?: string,
    playerClass?: string,
  ) {
    const key = this.getAverageScoreKey(world, playerClass);
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    const [total, rankings] = await Promise.all([
      this.redisClient.zCard(key),
      this.redisClient.zRangeWithScores(key, start, end, { REV: true }),
    ]);

    return {
      data: rankings.map((item, index) => {
        const player = JSON.parse(item.value);
        return {
          playerId: player.playerId,
          mainClass: player.playerClass,
          nickname: player.nickname,
          averageScore: item.score,
          rank: start + index + 1,
        };
      }),
      total: total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Get player stats
  async getPlayerStats(playerId: string, playerClass: string) {
    const statsKey = this.getPlayerStatsKey(playerId, playerClass);
    const stats = await this.redisClient.hGetAll(statsKey);

    if (!stats.gamesPlayed) {
      return null;
    }

    return {
      gamesPlayed: parseInt(stats.gamesPlayed),
      totalScore: parseFloat(stats.totalScore),
      totalKills: parseInt(stats.totalKills),
      totalDeaths: parseInt(stats.totalDeaths),
      totalAssists: parseInt(stats.totalAssists),
      wins: parseInt(stats.wins),
      avgScore: parseFloat(stats.avgScore),
      avgKills: parseFloat(stats.avgKills),
      avgDeaths: parseFloat(stats.avgDeaths),
      avgAssists: parseFloat(stats.avgAssists),
      winRate: parseFloat(stats.winRate),
      lastUpdated: stats.lastUpdated,
    };
  }

  // Get all player stats for a specific class (for ranking calculations)
  async getAllPlayerStatsForClass(playerClass: string) {
    try {
      // Get all keys for this class
      const pattern = `player:*:class:${playerClass}:stats`;
      const keys = await this.redisClient.keys(pattern);

      if (keys.length === 0) {
        return [];
      }

      // Get stats for all players in this class
      const playerStats = await Promise.all(
        keys.map(async (key) => {
          const stats = await this.redisClient.hGetAll(key);

          if (!stats.gamesPlayed || parseInt(stats.gamesPlayed) === 0) {
            return null;
          }

          // Extract playerId from key (format: player:playerId:class:playerClass:stats)
          const playerId = key.split(':')[1];

          return {
            playerId,
            playerClass,
            gamesPlayed: parseInt(stats.gamesPlayed),
            totalScore: parseFloat(stats.totalScore),
            totalKills: parseInt(stats.totalKills),
            totalDeaths: parseInt(stats.totalDeaths),
            totalAssists: parseInt(stats.totalAssists),
            wins: parseInt(stats.wins),
            avgScore: parseFloat(stats.avgScore),
            avgKills: parseFloat(stats.avgKills),
            avgDeaths: parseFloat(stats.avgDeaths),
            avgAssists: parseFloat(stats.avgAssists),
            winRate: parseFloat(stats.winRate),
          };
        }),
      );

      // Filter out null entries and return valid stats
      return playerStats.filter((stat) => stat !== null);
    } catch (error) {
      console.error(
        `[RedisLeaderboard] Error getting all player stats for class ${playerClass}:`,
        error,
      );
      return [];
    }
  }

  // Clear all leaderboards (useful for testing or reset)
  async clearAllLeaderboards() {
    const keys = await this.redisClient.keys('leaderboard:*');
    if (keys.length > 0) {
      await this.redisClient.del(keys);
    }
    console.log('[RedisLeaderboard] Cleared all leaderboards');
  }

  // Initialize leaderboards from existing database data
  async initializeFromDatabase() {
    try {
      console.log('[RedisLeaderboard] Initializing from database...');

      // Get all player performances from the database
      const performances = await this.prisma.playerPerformance.findMany({
        include: {
          player: true,
        },
      });

      if (performances.length === 0) {
        console.log('[RedisLeaderboard] No performances found in database');
        return;
      }

      // Group performances by player and class
      const playerStats = new Map<
        string,
        {
          gamesPlayed: number;
          totalScore: number;
          totalKills: number;
          totalDeaths: number;
          totalAssists: number;
          wins: number;
        }
      >();

      for (const perf of performances) {
        const key = `${perf.playerId}:${perf.playerClass}`;
        const current = playerStats.get(key) || {
          gamesPlayed: 0,
          totalScore: 0,
          totalKills: 0,
          totalDeaths: 0,
          totalAssists: 0,
          wins: 0,
        };

        current.gamesPlayed++;
        current.totalScore += perf.score;
        current.totalKills += perf.kills;
        current.totalDeaths += perf.deaths;
        current.totalAssists += perf.assists;
        current.wins += perf.win ? 1 : 0;

        playerStats.set(key, current);
      }

      // Update Redis with calculated stats
      for (const [key, stats] of playerStats) {
        const [playerId, playerClass] = key.split(':');

        const avgScore = stats.totalScore / stats.gamesPlayed;
        const avgKills = stats.totalKills / stats.gamesPlayed;
        const avgDeaths = stats.totalDeaths / stats.gamesPlayed;
        const avgAssists = stats.totalAssists / stats.gamesPlayed;
        const winRate = (stats.wins / stats.gamesPlayed) * 100;

        await this.updatePlayerStats(
          playerId,
          playerClass,
          avgScore,
          avgKills,
          avgDeaths,
          avgAssists,
          stats.wins > 0,
        );
      }

      console.log(
        `[RedisLeaderboard] Initialized ${playerStats.size} player stats from database`,
      );
    } catch (error) {
      console.error(
        '[RedisLeaderboard] Error initializing from database:',
        error,
      );
    }
  }
}
