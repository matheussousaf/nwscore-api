import { BestPerformanceDto } from './best-performance.dto';
import { RecentWarDto } from './recent-wars.dto';
import { TrendingPlayerDto } from './trending-players.dto';
import { TopPerformerDto } from './top-performers.dto';

export class StatisticsDto {
  recentWars: RecentWarDto[];
  trendingPlayers: TrendingPlayerDto[];
  bestPerformances: BestPerformanceDto[];
  topPerformers: TopPerformerDto[];
}
