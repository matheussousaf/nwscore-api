import { Player } from '@prisma/client';

export interface IPlayerRepository {
  upsertPlayers(nicknames: string[], world?: string): Promise<Player[]>;
  findPlayerByNickname(nickname: string): Promise<{
    id: string;
    nickname: string;
    world: string;
    createdAt: Date;
    updatedAt: Date;
    classes: {
      playerClass: string;
      kills: { total: number; avg: number };
      deaths: { total: number; avg: number };
      assists: { total: number; avg: number };
      healing: { total: number; avg: number };
      damage: { total: number; avg: number };
      wins: { total: number; winrate: number };
    }[];
    recentPerformances: {
      playerId: string;
      playerClass: string;
      score: number;
      win: boolean;
      attacker: string;
      defender: string;
      territory: string;
      stats: {
        kills: number;
        deaths: number;
        assists: number;
        healing: number;
        damage: number;
      };
    }[];
    playerProfile: {
      views: number;
      likes: number;
    };
  } | null>;
  searchPlayers(
    query?: string,
    page?: number,
    limit?: number,
  ): Promise<{
    data: {
      playerId: string;
      nickname: string;
      classes: string[];
      world?: string;
    }[];
    total: number;
  }>;
  getWinRateLeaderboard(
    page: number,
    limit: number,
    minGames?: number,
    world?: string,
    playerClass?: string,
  ): Promise<{
    data: {
      playerId: string;
      mainClass: string;
      nickname: string;
      winrate: number;
      totalGames: number;
    }[];
    total: number;
  }>;
  getMostWinsLeaderboard(
    page: number,
    limit: number,
    minGames?: number,
    world?: string,
    playerClass?: string,
  ): Promise<{
    data: {
      playerId: string;
      mainClass: string;
      nickname: string;
      mostWins: number;
      winStreak: number;
    }[];
    total: number;
  }>;
  getLeastDeathsLeaderboard(
    page: number,
    limit: number,
    minGames?: number,
    world?: string,
    playerClass?: string,
  ): Promise<{
    data: {
      playerId: string;
      mainClass: string;
      nickname: string;
      averageDeaths: number;
      totalDeaths: number;
    }[];
    total: number;
  }>;
  getMostKillsLeaderboard(
    page: number,
    limit: number,
    minGames?: number,
    world?: string,
    playerClass?: string,
  ): Promise<{
    data: {
      playerId: string;
      mainClass: string;
      nickname: string;
      averageKills: number;
      totalKills: number;
    }[];
    total: number;
  }>;
  getMostAssistsLeaderboard(
    page: number,
    limit: number,
    minGames?: number,
    world?: string,
    playerClass?: string,
  ): Promise<{
    data: {
      playerId: string;
      mainClass: string;
      nickname: string;
      averageAssists: number;
      totalAssists: number;
    }[];
    total: number;
  }>;
}
