import { Injectable, OnModuleInit } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisBackgroundService implements OnModuleInit {
  private redisClient: RedisClientType;

  constructor() {
    this.redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });
  }

  async onModuleInit() {
    await this.redisClient.connect();
    console.log('[RedisBackground] Connected to Redis');
  }

  // Update Redis leaderboards for a single performance (optimized)
  async updateLeaderboardsForPerformance(
    playerId: string,
    playerClass: string,
    score: number,
    kills: number,
    deaths: number,
    assists: number,
    win: boolean,
  ) {
    try {
      const statsKey = `player:${playerId}:class:${playerClass}:stats`;
      
      // Use Redis pipeline for atomic operations
      const pipeline = this.redisClient.multi();
      
      // Increment counters atomically
      pipeline.hIncrBy(statsKey, 'gamesPlayed', 1);
      pipeline.hIncrByFloat(statsKey, 'totalScore', score);
      pipeline.hIncrBy(statsKey, 'totalKills', kills);
      pipeline.hIncrBy(statsKey, 'totalDeaths', deaths);
      pipeline.hIncrBy(statsKey, 'totalAssists', assists);
      if (win) {
        pipeline.hIncrBy(statsKey, 'wins', 1);
      }
      
      // Execute pipeline
      await pipeline.exec();
      
      // Get updated stats in a single call
      const stats = await this.redisClient.hGetAll(statsKey);
      
      const gamesPlayed = parseInt((stats.gamesPlayed as string) || '1');
      const totalScore = parseFloat((stats.totalScore as string) || '0');
      const totalKills = parseInt((stats.totalKills as string) || '0');
      const totalDeaths = parseInt((stats.totalDeaths as string) || '0');
      const totalAssists = parseInt((stats.totalAssists as string) || '0');
      const wins = parseInt((stats.wins as string) || '0');

      const avgScore = totalScore / gamesPlayed;
      const avgKills = totalKills / gamesPlayed;
      const avgDeaths = totalDeaths / gamesPlayed;
      const avgAssists = totalAssists / gamesPlayed;
      const winRate = (wins / gamesPlayed) * 100;

      // Update averages and leaderboards in parallel
      const playerData = JSON.stringify({
        playerId,
        playerClass,
        nickname: '',
      });

      await Promise.all([
        // Update averages
        this.redisClient.hSet(statsKey, {
          avgScore: avgScore.toString(),
          avgKills: avgKills.toString(),
          avgDeaths: avgDeaths.toString(),
          avgAssists: avgAssists.toString(),
          winRate: winRate.toString(),
          lastUpdated: new Date().toISOString(),
        }),
        // Update leaderboards in parallel
        this.redisClient.zAdd('leaderboard:winrate', { score: winRate, value: playerData }),
        this.redisClient.zAdd('leaderboard:mostwins', { score: wins, value: playerData }),
        this.redisClient.zAdd('leaderboard:leastdeaths', { score: -avgDeaths, value: playerData }),
        this.redisClient.zAdd('leaderboard:mostkills', { score: avgKills, value: playerData }),
        this.redisClient.zAdd('leaderboard:mostassists', { score: avgAssists, value: playerData }),
      ]);

    } catch (error) {
      console.error(`[RedisBackground] Error updating leaderboards for player ${playerId}, class ${playerClass}:`, error);
    }
  }

  // Update Redis leaderboards for multiple performances (highly optimized)
  async updateLeaderboardsForPerformances(
    performances: Array<{
      playerId: string;
      playerClass: string;
      score: number;
      kills: number;
      deaths: number;
      assists: number;
      win: boolean;
    }>,
  ) {
    console.log(`[RedisBackground] Starting async update for ${performances.length} performances`);
    
    // Process in background without blocking the main thread
    setImmediate(async () => {
      try {
        await this.processPerformancesInBatches(performances);
        console.log(`[RedisBackground] Completed async update for ${performances.length} performances`);
      } catch (error) {
        console.error('[RedisBackground] Error in background processing:', error);
      }
    });
  }

  // Process performances in optimized batches
  private async processPerformancesInBatches(
    performances: Array<{
      playerId: string;
      playerClass: string;
      score: number;
      kills: number;
      deaths: number;
      assists: number;
      win: boolean;
    }>,
  ) {
    // Group performances by player-class to avoid duplicate processing
    const playerClassMap = new Map<string, {
      playerId: string;
      playerClass: string;
      totalScore: number;
      totalKills: number;
      totalDeaths: number;
      totalAssists: number;
      gamesPlayed: number;
      wins: number;
    }>();

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
    const batchSize = 20; // Increased batch size for better performance

    for (let i = 0; i < aggregatedPerformances.length; i += batchSize) {
      const batch = aggregatedPerformances.slice(i, i + batchSize);
      
      // Process batch in parallel
      await Promise.all(
        batch.map(async (aggPerf) => {
          const statsKey = `player:${aggPerf.playerId}:class:${aggPerf.playerClass}:stats`;
          
          try {
            // Use pipeline for atomic operations
            const pipeline = this.redisClient.multi();
            
            // Increment counters
            pipeline.hIncrBy(statsKey, 'gamesPlayed', aggPerf.gamesPlayed);
            pipeline.hIncrByFloat(statsKey, 'totalScore', aggPerf.totalScore);
            pipeline.hIncrBy(statsKey, 'totalKills', aggPerf.totalKills);
            pipeline.hIncrBy(statsKey, 'totalDeaths', aggPerf.totalDeaths);
            pipeline.hIncrBy(statsKey, 'totalAssists', aggPerf.totalAssists);
            pipeline.hIncrBy(statsKey, 'wins', aggPerf.wins);
            
            await pipeline.exec();
            
            // Get updated stats and update averages/leaderboards
            const stats = await this.redisClient.hGetAll(statsKey);
            
            const gamesPlayed = parseInt((stats.gamesPlayed as string) || '1');
            const totalScore = parseFloat((stats.totalScore as string) || '0');
            const totalKills = parseInt((stats.totalKills as string) || '0');
            const totalDeaths = parseInt((stats.totalDeaths as string) || '0');
            const totalAssists = parseInt((stats.totalAssists as string) || '0');
            const wins = parseInt((stats.wins as string) || '0');

            const avgScore = totalScore / gamesPlayed;
            const avgKills = totalKills / gamesPlayed;
            const avgDeaths = totalDeaths / gamesPlayed;
            const avgAssists = totalAssists / gamesPlayed;
            const winRate = (wins / gamesPlayed) * 100;

            const playerData = JSON.stringify({
              playerId: aggPerf.playerId,
              playerClass: aggPerf.playerClass,
              nickname: '',
            });

            // Update everything in parallel
            await Promise.all([
              this.redisClient.hSet(statsKey, {
                avgScore: avgScore.toString(),
                avgKills: avgKills.toString(),
                avgDeaths: avgDeaths.toString(),
                avgAssists: avgAssists.toString(),
                winRate: winRate.toString(),
                lastUpdated: new Date().toISOString(),
              }),
              this.redisClient.zAdd('leaderboard:winrate', { score: winRate, value: playerData }),
              this.redisClient.zAdd('leaderboard:mostwins', { score: wins, value: playerData }),
              this.redisClient.zAdd('leaderboard:leastdeaths', { score: -avgDeaths, value: playerData }),
              this.redisClient.zAdd('leaderboard:mostkills', { score: avgKills, value: playerData }),
              this.redisClient.zAdd('leaderboard:mostassists', { score: avgAssists, value: playerData }),
            ]);
          } catch (error) {
            console.error(`[RedisBackground] Error processing ${aggPerf.playerId}:${aggPerf.playerClass}:`, error);
          }
        })
      );

      // Minimal delay between batches
      if (i + batchSize < aggregatedPerformances.length) {
        await new Promise(resolve => setTimeout(resolve, 5));
      }
    }
  }

  // Initialize leaderboards from database (for migration)
  async initializeFromDatabase(performances: Array<{
    playerId: string;
    playerClass: string;
    score: number;
    kills: number;
    deaths: number;
    assists: number;
    win: boolean;
  }>) {
    console.log('[RedisBackground] Initializing leaderboards from database...');
    
    // Group performances by player and class
    const playerStats = new Map<string, {
      gamesPlayed: number;
      totalScore: number;
      totalKills: number;
      totalDeaths: number;
      totalAssists: number;
      wins: number;
    }>();

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

      await this.updateLeaderboardsForPerformance(
        playerId,
        playerClass,
        avgScore,
        avgKills,
        avgDeaths,
        avgAssists,
        stats.wins > 0,
      );
    }

    console.log(`[RedisBackground] Initialized ${playerStats.size} player stats`);
  }

  // Clear all leaderboards (useful for testing or reset)
  async clearAllLeaderboards() {
    const keys = await this.redisClient.keys('leaderboard:*');
    if (keys.length > 0) {
      await this.redisClient.del(keys);
    }
    console.log('[RedisBackground] Cleared all leaderboards');
  }
} 