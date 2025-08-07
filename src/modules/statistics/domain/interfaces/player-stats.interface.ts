export interface PlayerStats {
  gamesPlayed: number;
  totalScore: number;
  totalKills: number;
  totalDeaths: number;
  totalAssists: number;
  wins: number;
  avgScore: number;
  avgKills: number;
  avgDeaths: number;
  avgAssists: number;
  winRate: number;
  playerId?: string;
  playerClass?: string;
  lastUpdated: string;
}
