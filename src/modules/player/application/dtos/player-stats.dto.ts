export interface PlayerStatsDto {
  warsPlayed: number;
  winRate: number; // 0–100
  total: {
    kills: number;
    deaths: number;
    assists: number;
    damage: number;
    healing: number;
  };
  perWar: {
    kills: number;
    deaths: number;
    assists: number;
    damage: number;
    healing: number;
  };
  warHistory: WarHistoryEntry[];
}

export interface WarHistoryEntry {
  date: string;
  territory: string;
  opponent: string;
  playerClass: string;
  kills: number;
  deaths: number;
  assists: number;
  damage: number;
  healing: number;
  win: boolean;
}
