import { LeaderboardEntry } from './leaderboard-entry.interface';

export interface LeaderboardResponse {
  data: LeaderboardEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
